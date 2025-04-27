import express from 'express';

import OpenAI from 'openai';

import 'dotenv/config';

import { MCPHost } from '@mcp-synergy/host';

const mcpHost = new MCPHost('./mcp_servers.config.json', true);

import cors from 'cors';
import MCPRender from '../../mcpServers/component-render-mcp/index';

const mcpRenderComponent = new MCPRender.MCPRenderComponent();

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
// @ts-ignore
// app.use(signatureMiddleware);

app.get('/', (req, res) => {
  // 从 req 中获取 signature
  res.send('Hello World!');
});

app.post('/update-mcp-comps', async (req, res) => {
  const { data } = req.body;

  mcpRenderComponent.updateTools(data);

  res.send('ok');
});

app.post('/message', async (req, res) => {
  try {
    const { messages } = req.body;

    // 获取可用工具列表
    const tools = await mcpHost.getTools();

    // @ts-ignore
    const toolsList = (tools ?? []) as any[];

    const availableTools = toolsList?.reduce((pre, cur) => {
      if (cur?.tools?.length) {
        // @ts-ignore
        cur.tools.forEach((item) => {
          pre.push({
            type: 'function',
            function: {
              name: `${cur.server_name}_${item.name}`,
              description: item?.description || '',
              parameters: {
                type: item.inputSchema.type,
                required: item.inputSchema.required || [],
                properties: item.inputSchema.properties,
              },
            },
          });
        });
      }
      return pre;
    }, []);

    availableTools.push(
      ...[...mcpRenderComponent.tools.values()].map((tool) => {
        return {
          type: 'function',
          function: {
            name: `mcp-component-render_${tool.name}`,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        };
      }),
    );

    console.log('availableTools', JSON.stringify(availableTools, null, 2));

    const response = await openai.chat.completions.create({
      messages: messages || [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
      model: 'deepseek-chat',
      tools: availableTools ?? [],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const content = response.choices[0];
    let meta: any = {};

    let responseMessage = content.message.content;

    if (content.finish_reason === 'tool_calls') {
      // @ts-ignore
      const toolCall = content.message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;
      const serverName = toolName.split('_')[0];
      // 第一个 _ 后面的内容，可能存在多个 _
      const functionName = toolName.split('_').slice(1).join('_');

      console.log('serverName', serverName);
      console.log('functionName', functionName);
      console.log('toolArgs', toolArgs);

      let res: any = {};
      if (serverName === 'mcp-component-render') {
        res = await mcpRenderComponent.handleToolCall(functionName, toolArgs);
      } else {
        const res = (await mcpHost.toolCall({
          serverName,
          toolName: functionName,
          // @ts-ignore
          toolArgs: JSON.parse(toolArgs),
        })) as any;
      }

      const prefix = `Matched tool \`${functionName}\` in MCP server \`${serverName}\`, **result**:\n`;
      const aiOutput =
        res.meta?.aiOutput?.type === 'text'
          ? res.meta?.aiOutput?.content || ''
          : '';
      meta = {
        serverName,
        toolName: functionName,
        componentProps: res.meta?.props,
        aiOutput,
      };

      const json = `\`\`\`json
${JSON.stringify(res.content, null, 2)}
\`\`\``;
      responseMessage = `${prefix} ${json}`;
    }

    res.write(
      JSON.stringify({
        code: 0,
        data: {
          content:
            responseMessage + `${meta?.aiOutput ? `\n${meta?.aiOutput}` : ''}`,
          meta,
        },
      }),
    );
    res.end();
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
