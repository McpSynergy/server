import express from 'express';
import { signatureMiddleware } from './middleware/signatureMiddleware';

import OpenAI from "openai";

import 'dotenv/config'

import { MCPHost } from '@mcp-synergy/host'


const mcpHost = new MCPHost("./mcp_servers.config.json", true);


const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const app = express();
const port = 3000;

app.use(express.json());
// @ts-ignore
app.use(signatureMiddleware);

app.get('/', (req, res) => {
  // 从 req 中获取 signature
  res.send('Hello World!');
});

const formatJson = (str: string) => {
  const json = `\`\`\`json
${str}
\`\`\``
  return json
}
app.post('/message', async (req, res) => {
  try {
    const { messages } = req.body;

    // 获取可用工具列表
    const tools = await mcpHost.getTools()

    // @ts-ignore
    const toolsList = tools;
    const availableTools = toolsList?.reduce((pre, cur) => {
      if (cur?.tools?.length) {
        // @ts-ignore
        cur.tools.forEach(item => {
          pre.push({
            "type": "function",
            "function": {
              "name": `${cur.server_name}_${item.name}`,
              "description": item?.description || '',
              "parameters": {
                type: item.inputSchema.type,
                required: item.inputSchema.required || [],
                properties: item.inputSchema.properties,
              },
            }
          })
        })
      }
      return pre;
    }, [] as any[])

    const response = await openai.chat.completions.create({
      messages: messages || [{ role: "system", content: "You are a helpful assistant." }],
      model: "deepseek-chat",
      tools: availableTools ?? [],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const content = response.choices[0]
    let meta: any = {}

    let responseMessage = content.message.content;

    if (content.finish_reason === 'tool_calls') {
      // @ts-ignore
      const toolCall = content.message.tool_calls[0]
      const toolName = toolCall.function.name
      const toolArgs = toolCall.function.arguments
      const serverName = toolName.split('_')[0]
      // 第一个 _ 后面的内容，可能存在多个 _
      const functionName = toolName.split('_').slice(1).join('_')

      console.log("serverName", serverName);
      console.log("functionName", functionName);
      console.log("toolArgs", toolArgs);

      const res = await mcpHost.toolCall({
        serverName,
        toolName: functionName,
        toolArgs: JSON.parse(toolArgs),
      })
      const apiOutput = res?._meta?.apiOutput as {
        type: string,
        content: string,
      }
      const prefix = `Matched tool \`${functionName}\` in MCP server \`${serverName}\`, **result**:\n`
      const aiOutput = apiOutput?.type === 'text' ? apiOutput?.content || '' : ''
      meta = {
        serverName,
        toolName: functionName,
        componentProps: res?._meta?.props,
        aiOutput,
      }
      responseMessage = `${prefix}${formatJson(JSON.stringify(res, null, 2))}`
    }

    res.write(JSON.stringify({
      code: 0,
      data: {
        content: responseMessage + `${meta?.aiOutput ? `\n${meta?.aiOutput}` : ''}`,
        meta,
      }
    }));
    res.end()
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, (error) => {
  if (error) {
    console.error('Error starting server:', error);
    return;
  }
  console.log(`Server running at http://localhost:${port}`);
});