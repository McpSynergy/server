import { Router } from "express";
import { MCPService } from "../services/mcpService";
import { AIService } from "../services/aiService";
import { ThinkingService } from "../services/thinkingService";
import { parseToolResult } from "../utils";
import { UnifiedApiResponse, UnifiedResponseData, ToolMeta } from "../types";

const router = Router();

router.post("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { messages } = req.body;

    // 获取可用工具列表
    const availableTools = await MCPService.getAvailableTools();
    // 调用 AI
    const response = await AIService.createChatCompletion(messages, availableTools);

    const content = response.choices[0];

    let responseData: UnifiedResponseData;

    console.log("当前的 content", {
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

      const toolResult = await MCPService.callTool(serverName, functionName, JSON.parse(toolArgs));

      // 特殊处理 sequential-thinking
      if (serverName === "sequential-thinking" && functionName === "sequentialthinking") {
        const result = await ThinkingService.handleSequentialThinking(toolArgs, toolResult, res);

        // 如果返回了结果，说明是非流式响应
        if (result) {
          responseData = result;
        } else {
          // 流式响应已经在 ThinkingService 中处理完毕
          return;
        }
      } else {
        // 其他工具的处理
        const apiOutput = parseToolResult(toolResult);
        const prefix = `Matched tool \`${functionName}\` in MCP server \`${serverName}\`;`;
        const aiOutput = apiOutput?.type === "text" ? apiOutput?.content || "" : "";

        const meta: ToolMeta = {
          serverName,
          toolName: functionName,
          componentProps: toolResult?._meta?.props,
          aiOutput,
        };

        responseData = {
          content: prefix,
          meta: meta
        };
      }
    } else {
      // 没有工具调用，只是普通的AI响应
      const meta: ToolMeta = {
        serverName: 'null',
        toolName: "null",
        componentProps: {},
        aiOutput: content.message.content || "",
      };

      responseData = {
        content: content.message.content || "",
        meta: meta
      };
    }

    const response_: UnifiedApiResponse = {
      code: 0,
      data: responseData
    };

    res.write(`data: ${JSON.stringify(response_)}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error:", error);
    const errorResponse = {
      code: 500,
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error)
    };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

export { router as messageRouter }; 