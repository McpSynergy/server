import cors from "cors";
import express from "express";
import { signatureMiddleware } from "./middleware/signatureMiddleware";
import OpenAI from "openai";
import "dotenv/config";
import { MCPHost } from "@mcp-synergy/host";
import { books } from "./book";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpHost = new MCPHost({
  mcpServer: {
    configPath: path.join(__dirname, "..", "mcp_servers.config.json")
  },
  mcpComponent: {
    configPath: path.join(__dirname, "..", "mcp_components.config.json")
  },
  watch: process.env.NODE_ENV !== 'production'
});

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const app = express();
const port = process.env.PORT || 3000;

// 配置 CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-signature'],
  credentials: true,
  maxAge: 86400
}));

app.use(express.json());
// @ts-ignore
app.use(signatureMiddleware);

app.get("/", (req, res) => {
  // 从 req 中获取 signature
  res.send("Hello World!");
});

const formatJson = (str: string) => {
  const json = `\`\`\`json
${str}
\`\`\``;
  return json;
};
app.post("/message", async (req, res) => {
  try {
    const { messages } = req.body;

    // 获取可用工具列表
    const tools = await mcpHost.getTools();

    // @ts-ignore
    const toolsList = tools;

    console.log({
      toolsList: JSON.stringify(toolsList, null, 2)
    });


    const availableTools = toolsList?.reduce((pre, cur) => {
      if (cur?.tools?.length) {
        // @ts-ignore
        cur.tools.forEach((item) => {

          console.log(`${cur.server_name}_${item.name}`);

          pre.push({
            type: "function",
            function: {
              name: `${cur.server_name}_${item.name}`,
              description: item?.description || "",
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
    }, [] as any[]);


    console.log({
      availableTools: JSON.stringify(availableTools, null, 2)
    });


    const response = await openai.chat.completions.create({
      messages: messages || [
        { role: "system", content: "You are a helpful assistant." },
      ],
      model: "deepseek-chat",
      tools: availableTools ?? [],
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const content = response.choices[0];
    let meta: any = {};

    let responseMessage = content.message.content;

    console.log({
      content
    });


    if (content.finish_reason === "tool_calls") {
      // @ts-ignore
      const toolCall = content.message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = toolCall.function.arguments;
      const serverName = toolName.split("_")[0];
      // 第一个 _ 后面的内容，可能存在多个 _
      const functionName = toolName.split("_").slice(1).join("_");

      console.log("serverName", serverName);
      console.log("functionName", functionName);
      console.log("toolArgs", toolArgs);

      const res = await mcpHost.toolCall({
        serverName,
        toolName: functionName,
        toolArgs: JSON.parse(toolArgs),
      });
      const apiOutput = res?._meta?.apiOutput as {
        type: string;
        content: string;
      };
      const prefix = `Matched tool \`${functionName}\` in MCP server \`${serverName}\`;`;
      const aiOutput =
        apiOutput?.type === "text" ? apiOutput?.content || "" : "";
      meta = {
        serverName,
        toolName: functionName,
        componentProps: res?._meta?.props,
        aiOutput,
      };
      // responseMessage = `${prefix}${formatJson(JSON.stringify(res, null, 2))}`;
      responseMessage = prefix
    }

    res.write(
      JSON.stringify({
        code: 0,
        data: {
          // content:
          //   responseMessage + `${meta?.aiOutput ? `\n${meta?.aiOutput}` : ""}`,
          content: responseMessage,
          meta,
        },
      }),
    );
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/books", async (req, res) => {
  res.json({
    code: 0,
    data: books,
  });
});
app.get("/books/:bookId", async (req, res) => {
  const { bookId } = req.params;
  const book = books.find((book) => book.id === bookId);
  res.json({
    code: 0,
    data: book,
  });
});

app.get("/api/config", async (req, res) => {
  const config = fs.readFileSync(path.join(__dirname, "..", "mcp_components.config.json"), "utf-8");
  res.json({
    code: 0,
    data: JSON.parse(config),
  });
})

app.post("/api/config", async (req, res) => {
  const { config } = req.body;

  //将 config 保存在项目的根路径
  fs.writeFileSync(path.join(__dirname, "..", "mcp_components.config.json"), JSON.stringify(config, null, 2));

  try {
    res.json({
      code: 0,
      data: config,
    });
  } catch (error) {
    console.error("Error updating MCP connections:", error);
    res.status(500).json({
      code: 500,
      message: "Failed to update MCP connections",
      error: error instanceof Error ? error.message : String(error)
    });
  }
})

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 处理
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: "Not Found" });
});

// 只在非生产环境下启动服务器
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// 导出 app 实例供 Vercel 使用
export default app;
