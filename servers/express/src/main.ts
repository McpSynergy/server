import express from 'express';
import { Signature } from './signature';
import { signatureMiddleware } from './middleware/signatureMiddleware';

import OpenAI from "openai";

import 'dotenv/config'


const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const data = {
  "nonce": "a3fB9zLpQ2RgT8yX",
  "payload": {
    "user_id": "USER_6192_XYZ",
  }
}
const signature = Signature.generateSignature(JSON.stringify(data), process.env.SECRET);

console.log("signature", signature);

const app = express();
const port = 3000;

app.use(express.json());
app.use(signatureMiddleware);

app.get('/', (req, res) => {
  // 从 req 中获取 signature
  res.send('Hello World!');
});

const fetchTools = async () => {
  return fetch('http://localhost:17925/api/tools', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    }
  }).then(res => res.json())
}

const toolsCall = async ({
  serverName,
  toolName,
  toolArgs,
}: {
  serverName: string;
  toolName: string;
  toolArgs: any;
}) => {
  return fetch('http://localhost:17925/api/tools/toolCall', {
    method: 'Post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      server_name: serverName,
      tool_name: toolName,
      tool_args: JSON.parse(toolArgs),
    }),
  })
    .then((res) => res.json())

}

app.post('/message', async (req, res) => {
  try {
    const { messages } = req.body;

    // 获取可用工具列表
    const tools = await fetchTools();
    // @ts-ignore
    const toolsList = (tools?.data ?? []) as any[];
    const availableTools = toolsList?.reduce((pre, cur) => {
      if (cur?.tools?.length) {
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
    }, [])

    // console.log("availableTools", availableTools);


    const response = await openai.chat.completions.create({
      messages: messages || [{ role: "system", content: "You are a helpful assistant." }],
      model: "deepseek-chat",
      tools: availableTools,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const content = response.choices[0]
    let meta: any = {}

    let responseMessage = content.message.content;

    if (content.finish_reason === 'tool_calls') {
      const toolCall = content.message.tool_calls[0]
      const toolName = toolCall.function.name
      const toolArgs = toolCall.function.arguments
      const serverName = toolName.split('_')[0]
      // 第一个 _ 后面的内容，可能存在多个 _
      const functionName = toolName.split('_').slice(1).join('_')

      console.log("serverName", serverName);
      console.log("functionName", functionName);
      console.log("toolArgs", toolArgs);

      // 调用工具
      const res = await toolsCall({
        serverName,
        toolName: functionName,
        toolArgs,
      }) as any

      // console.log("res", res);

      // @ts-ignore
      // const res_ = res
      // @ts-ignore
      console.log("success", res, res.data.content);
      const prefix = `Matched tool \`${functionName}\` in MCP server \`${serverName}\`, **result**:\n`
      const aiOutput = res.data.meta?.aiOutput?.type === 'text' ? res.data.meta?.aiOutput?.content || '' : ''
      meta = {
        serverName,
        toolName: functionName,
        componentProps: res.data.meta?.props,
        aiOutput,
      }

      const json = `\`\`\`json
${JSON.stringify(res.data.content, null, 2)}
\`\`\``
      responseMessage = `${prefix} ${json}`
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});