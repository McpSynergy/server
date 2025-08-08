import { Router } from "express";
import { MCPService } from "../services/mcpService";
import { AIService } from "../services/aiService";
import { ThinkingService } from "../services/thinkingService";
import { EventService } from "../services/eventService";
// import { parseToolResult } from "../utils";
import { RunAgentInput, Message } from "../types/events";

// 移除未使用的旧类型 ToolCallContent

// OpenAI 工具与流式增量类型定义（最小可用集）
type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: any;
  };
};

interface OpenAIToolCallDelta {
  id?: string;
  type?: string;
  index: number;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface OpenAIStreamDelta {
  content?: string;
  tool_calls?: OpenAIToolCallDelta[];
}

interface OpenAIStreamChoice {
  delta: OpenAIStreamDelta;
  finish_reason?: "stop" | "length" | "tool_calls" | "content_filter";
}

interface OpenAIStreamChunk {
  choices: OpenAIStreamChoice[];
}

interface AggregatedToolCall {
  id?: string;
  type?: string;
  index: number;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolCallAggregate {
  tool_calls: AggregatedToolCall[];
}

const aggregateToolCalls = (
  acc: ToolCallAggregate,
  deltas: OpenAIToolCallDelta[]
): ToolCallAggregate => {
  for (const toolCall of deltas) {
    let existing = acc.tool_calls.find(
      (tc) => (toolCall.id && tc.id === toolCall.id) || (!toolCall.id && tc.index === toolCall.index)
    );

    if (!existing) {
      existing = {
        id: toolCall.id,
        type: toolCall.type,
        index: toolCall.index,
        function: { name: "", arguments: "" }
      };
      acc.tool_calls.push(existing);
    }

    if (toolCall.function?.name) existing.function.name = toolCall.function.name;
    if (toolCall.function?.arguments) existing.function.arguments += toolCall.function.arguments.toString();
  }
  return acc;
};

const cleanToolArgs = (args: string): string => {
  let cleaned = args ?? "";
  // 移除 DeepSeek 工具调用结束标记
  cleaned = cleaned.replace(/<｜tool▁call▁end｜>|<｜tool▁calls▁end｜>/g, "");
  // 提取 ```json 包裹内容
  if (cleaned.includes("```json")) {
    const jsonMatch = cleaned.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) cleaned = jsonMatch[1].trim();
  }
  // 若为拼接的多个 JSON，仅取第一个完整对象
  try {
    JSON.parse(cleaned);
    return cleaned.trim();
  } catch {
    let depth = 0;
    const start = cleaned.indexOf("{");
    if (start === -1) return cleaned.trim();
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      if (cleaned[i] === "}") depth--;
      if (depth === 0) return cleaned.substring(start, i + 1).trim();
    }
    return cleaned.trim();
  }
};

const router = Router();

router.post("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const input: RunAgentInput = {
      threadId: req.body.threadId || `thread_${Date.now()}`,
      runId: req.body.runId,
      messages: req.body.messages || [],
      state: req.body.state,
      tools: req.body.tools,
      context: req.body.context,
      forwardedProps: req.body.forwardedProps
    };

    const eventService = new EventService(res, input);
    eventService.sendRunStarted();

    // 获取可用工具列表
    const availableTools = await MCPService.getAvailableTools();

    const messages_ = [
      { role: "system", content: "You are a helpful assistant." },
      ...input.messages.map((item: Message) => ({
        ...item,
        content: (item?.content ?? "") + (process.env.MESSAGE_SUFFIX ?? "")
      }))
    ];

    console.log("messages_", messages_);

    // eventService.sendCustomEvent("LOADING", 'intention_loading');
    // eventService.sendStepStarted("intention_loading");
    // eventService.sendCustomEvent("LOADING", 'search_knowledge_loading');
    eventService.sendStepStarted("LOADING");
    // eventService.sendCustomEvent("LOADING", 'rerank_loading');
    eventService.sendStepFinished("LOADING");

    eventService.sendStepStarted("SEARCH_KNOWLEDGE");
    eventService.sendStepFinished("SEARCH_KNOWLEDGE");

    eventService.sendStepStarted("RERANK");
    eventService.sendStepFinished("RERANK");


    const userInputTools: OpenAITool[] = input.tools?.map(item => ({
      type: "function",
      function: {
        name: item.name,
        description: item.description,
        parameters: item.parameters
      }
    })) ?? []

    // 调用 AI 并获取流式响应
    const stream = await AIService.createChatCompletion(messages_, [...userInputTools, ...((availableTools as OpenAITool[] | undefined) ?? [])]);

    eventService.sendCustomEvent("LOADING", 'qa_loading');

    let toolCallContent: ToolCallAggregate | null = null;
    let isToolCall = false;
    const messageId = `msg_${Date.now()}`;
    let messageStarted = false;

    // 处理流式响应
    for await (const chunk of (stream as unknown as AsyncIterable<OpenAIStreamChunk>)) {
      const choice = chunk?.choices?.[0];
      if (!choice) continue;

      // 收集工具调用的内容
      if (choice.delta?.tool_calls?.length) {
        isToolCall = true;
        toolCallContent = aggregateToolCalls(toolCallContent ?? { tool_calls: [] }, choice.delta.tool_calls);
        console.log("Tool call aggregated:", JSON.stringify(toolCallContent));
      }

      // 实时发送文本内容（开始-内容-结束）
      const deltaText = choice.delta?.content;
      if (deltaText && !isToolCall) {
        if (!messageStarted) {
          eventService.sendTextMessageStart(messageId);
          messageStarted = true;
        }
        eventService.sendTextMessageContent(messageId, deltaText);
      }

      // 根据结束原因处理
      if (choice.finish_reason === "tool_calls") {
        // 工具调用将开始，结束当前文本消息
        if (messageStarted) {
          eventService.sendTextMessageEnd(messageId);
          messageStarted = false;
        }
        break;
      }
      if (choice.finish_reason === "stop" || choice.finish_reason === "length") {
        if (messageStarted) {
          eventService.sendTextMessageEnd(messageId);
          messageStarted = false;
        }
        // 没有工具调用，直接结束
        if (!isToolCall) {
          eventService.end();
          return;
        }
      }
    }

    // 如果不是工具调用，结束响应并返回
    if (!isToolCall) {
      eventService.end();
      return;
    }

    if (!toolCallContent) {
      throw new Error("Tool call content is missing");
    }
    const content = { message: { tool_calls: toolCallContent.tool_calls }, finish_reason: "tool_calls" as const };
    if (content.finish_reason === "tool_calls") {
      // 处理所有工具调用
      const toolCalls = content.message.tool_calls;
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;

        if (availableTools?.find(item => item.function.name === toolName)) {
          const serverName = toolName.split("_")[0];
          // 第一个 _ 后面的内容，可能存在多个 _
          const functionName = toolName.split("_").slice(1).join("_");

          try {
            const cleanedArgs = cleanToolArgs(toolArgs);

            // 验证和解析 JSON 参数
            let parsedArgs;
            try {
              parsedArgs = JSON.parse(cleanedArgs);
            } catch (jsonError) {
              const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
              throw new Error(`Invalid JSON format in tool arguments: ${errorMessage}\nReceived args: ${cleanedArgs}`);
            }

            // 验证参数是否是一个有效的对象
            if (typeof parsedArgs !== 'object' || parsedArgs === null || Array.isArray(parsedArgs)) {
              throw new Error(`Tool arguments must be a single JSON object. Received: ${cleanedArgs}`);
            }

            const toolCallId = toolCall.id ?? `${toolName}_${toolCall.index}`;
            // 发送工具调用开始事件
            eventService.sendToolCallStart(
              toolName,
              parsedArgs,
              toolCallId
            );

            console.log("parsedArgs", serverName, functionName, parsedArgs);

            eventService.sendToolCallArgs(toolCallId, JSON.stringify(parsedArgs));
            const toolResult = await MCPService.callTool(serverName, functionName, parsedArgs);

            // 特殊处理 sequential-thinking
            if (serverName === "sequential-thinking" && functionName === "sequentialthinking") {
              const result = await ThinkingService.handleSequentialThinking(JSON.stringify(toolArgs), toolResult, res);
              if (!result) {
                // 流式响应已经在 ThinkingService 中处理完毕
                return;
              }
              // 发送工具调用结果
              eventService.sendToolCallEnd(
                toolName,
                result,
                toolCallId
              );
            } else {

              console.log("toolResult", toolResult);

              // 其他工具的处理
              const toolResult_ = {
                ...toolResult,
                serverName,
                toolName: functionName
              };
              // 发送工具调用结果

              eventService.sendToolCallEnd(
                toolName,
                toolResult_,
                toolCallId
              );

              // 如果是自定义事件（如音乐播放），发送自定义事件
              if (toolResult?._meta?.type === "custom") {
                const name = (toolResult as any)._meta?.name as string | undefined;
                eventService.sendCustomEvent((name ?? "LOADING") as any, (toolResult as any)._meta?.value);
              }

              // 发送文本消息
              // if (aiOutput) {
              // eventService.sendTextMessage(aiOutput);

              // 这里再调用大模型，组合一下 aiOutput 和 toolResult_ 的内容，再发送给大模型
              // const messages = [
              //   { role: "system", content: "You are a helpful assistant." },
              //   { role: "assistant", content: aiOutput },
              //   { role: "user", content: JSON.stringify(toolResult_) }
              // ];
              // const stream = await AIService.createChatCompletion(messages, availableTools);
              // for await (const chunk of stream as any) {
              //   const content = chunk.choices[0];
              //   // 实时发送所有文本内容
              //   if (content.delta?.content) {
              //     eventService.sendTextMessage(content.delta.content, messageId);
              //   }
              // }
              // }

            }
          } catch (toolError) {
            console.error(`工具 ${serverName}.${functionName} 调用失败:`, toolError);
            // 发送工具调用结果
            const toolCallId = toolCall.id ?? `${toolName}_${toolCall.index}`;
            eventService.sendToolCallEnd(
              toolName,
              {},
              toolCallId
            );
            // eventService.sendRunError(toolError instanceof Error ? toolError : String(toolError));
            eventService.sendTextMessage(`工具 ${serverName}.${functionName} 调用失败`, messageId);

            // const stream = await AIService.createChatCompletion(messages, availableTools);
          }
        } else if (userInputTools?.find(item => item.function.name === toolName)) {
          const toolCallId = toolCall.id ?? `${toolName}_${toolCall.index}`;
          eventService.sendToolCallStart(toolName, toolArgs, toolCallId);
          eventService.sendToolCallArgs(toolCallId, JSON.stringify(toolArgs));
          eventService.sendToolCallEnd(toolName, toolArgs, toolCallId);
          // 调用大模型，组合一下参数和用户的 messages 内容，再发送给大模型
          const stream = await AIService.createChatCompletion([
            {
              role: "system", content: `You are a helpful assistant that provides clear feedback about tool actions. When a tool is called, respond in a natural, confirmatory way that tells the user what has been done. Follow these guidelines:
- If the tool opens an app or launches something, say "I've opened [app/item name] for you"
- If the tool searches or looks up information, say "Here's what I found about [search term]"
- If the tool performs a specific action, say "I've [action] as requested"
- If the tool involves navigation or location, say "I've found the route to [destination]" or "The location of [place] is..."
- For any other tools, clearly state what action was taken with the specific parameters used

Always be concise and natural, focusing on confirming what was actually done.` },
            { role: "assistant", content: "user message language is " + (input.messages[input.messages.length - 1]?.content ?? "") + ", please respond in the same language." },
            { role: "assistant", content: `Using the tool "${toolName}" with parameters: ${JSON.stringify(toolArgs)}, I'll confirm the action taken.` }
          ]);
          for await (const chunk of stream as any) {
            const content = chunk.choices[0];
            if (content.delta?.content) {
              eventService.sendTextMessage(content.delta.content, messageId);
            }
          }

        }
      }
      // 结束响应
      eventService.end();
    }
  } catch (error) {
    console.error("Error:", error);
    const errorResponse = {
      code: 500,
      data: {
        content: error instanceof Error ? error.message : String(error),
        meta: [{
          serverName: 'null',
          toolName: "null",
          componentProps: {},
          aiOutput: "",
          isComplete: true
        }]
      },
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error)
    };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

export { router as messageRouter }; 