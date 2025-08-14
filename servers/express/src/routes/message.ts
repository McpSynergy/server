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

// 安全提取任意字符串中的首个 JSON 对象片段
const extractFirstJsonObject = (text: string): string | null => {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
};

// 将 role: "tool" 的消息转换为普通 assistant 轨迹信息
const sanitizeMessagesForOpenAI = (messages: Array<{ role: string; content: any }>) => {
  const result: Array<{ role: string; content: string } | { role: string; content: any }> = [];
  for (const msg of messages) {
    if (msg.role !== "tool") {
      result.push(msg as any);
      continue;
    }

    const rawText = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    const jsonSlice = extractFirstJsonObject(rawText);
    let toolName = "unknown_tool";
    let serverName = "unknown_server";
    let aiOutput: string | undefined;
    let parsed: any = undefined;
    if (jsonSlice) {
      try {
        parsed = JSON.parse(jsonSlice);
        toolName = parsed?.toolName || toolName;
        serverName = parsed?.serverName || serverName;
        aiOutput = parsed?._meta?.aiOutput?.content || parsed?._meta?.aiOutput?.text;
      } catch {
        // ignore parse errors, fall back to raw
      }
    }

    const summaryText = aiOutput
      ? aiOutput
      : (parsed ? JSON.stringify(parsed).slice(0, 500) + (JSON.stringify(parsed).length > 500 ? "…" : "")
        : rawText.slice(0, 500) + (rawText.length > 500 ? "…" : ""));

    const assistantTrace = {
      role: "assistant",
      content:
        `Tool result:\n- tool: ${toolName}\n- server: ${serverName}\nPreview:\n\n` +
        "```json\n" + summaryText + "\n```\n\n" +
        "Assume the action already ran. Use this result; do not suggest re-running."
    } as const;

    result.push(assistantTrace as any);
  }
  return result;
};

// 将 context 序列化为简洁的系统提示，注入给大模型
const formatContextForSystemMessage = (context: any): string => {
  try {
    if (Array.isArray(context)) {
      const lines = context.map((item) => {
        if (item && typeof item === "object" && "description" in item && "value" in item) {
          return `- ${String(item.description)}: ${String(item.value)}`;
        }
        return `- ${typeof item === "object" ? JSON.stringify(item) : String(item)}`;
      });
      return `Session context:\n${lines.join("\n")}\n\nUse this context when answering. If language or theme are given, match the language and respect the theme.`;
    }
    // 对象或其他类型，直接 JSON 序列化
    const json = typeof context === "string" ? context : JSON.stringify(context);
    return `Session context (JSON):\n\n\`\`\`json\n${json}\n\`\`\`\n\nUse this context in your reply.`.replace(/`/g, "`");
  } catch {
    return `Context hint: ${String(context)}`;
  }
};

// JSON Pointer 工具
const decodePointerToken = (token: string): string => token.replace(/~1/g, "/").replace(/~0/g, "~");
const parseJsonPointer = (path: string): string[] => {
  if (!path || path === "/") return [];
  if (path[0] !== "/") return [];
  return path
    .substring(1)
    .split("/")
    .map(decodePointerToken);
};

const getValueByPointer = (obj: any, path: string): any => {
  try {
    const tokens = parseJsonPointer(path);
    let cur: any = obj;
    for (const raw of tokens) {
      if (cur === null || cur === undefined) return undefined;
      const isArray = Array.isArray(cur);
      if (isArray) {
        const idx = raw === "-" ? cur.length : Number.isInteger(Number(raw)) ? Number(raw) : NaN;
        if (Number.isNaN(idx) || idx < 0 || idx >= cur.length) return undefined;
        cur = cur[idx];
      } else if (typeof cur === "object") {
        cur = (cur as any)[raw];
      } else {
        return undefined;
      }
    }
    return cur;
  } catch {
    return undefined;
  }
};

const coerceValueToMatchType = (example: any, value: any): any => {
  if (Array.isArray(example)) {
    return Array.isArray(value) ? value : [value];
  }
  if (typeof example === "string") {
    return typeof value === "string" ? value : String(value);
  }
  return value;
};

const normalizePatchWithStateType = (state: any, delta: any[]): any[] => {
  if (!state || typeof state !== "object") return delta;
  return delta.map((op) => {
    if (!op || typeof op !== "object") return op;
    if (!("value" in op)) return op;
    const current = getValueByPointer(state, op.path);
    if (current === undefined) return op;
    return { ...op, value: coerceValueToMatchType(current, op.value) };
  });
};

// 无需额外检测：通过工具调用 state_delta 由大模型直接判断是否生成 JSON Patch

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

    const baseSystem = { role: "system", content: "You are a helpful assistant. If no tool can be called, briefly state the reason and the next step." } as const;
    const contextSystem = input.context
      ? ({ role: "system", content: formatContextForSystemMessage(input.context) } as const)
      : null;
    const stateSystem = input.state
      ? (() => {
        const fields = input.state && typeof input.state === 'object' ? Object.entries(input.state as Record<string, any>) : [];
        const lines: string[] = [];
        const valuesSnapshot: Record<string, any> = {};
        for (const [key, meta] of fields) {
          const desc = (meta && typeof meta === 'object' && 'description' in meta) ? String(meta.description) : '';
          const val = (meta && typeof meta === 'object' && 'value' in meta) ? meta.value : undefined;
          const valuePreview = typeof val === 'string' ? val : JSON.stringify(val);
          lines.push(`- ${key}: ${desc}\n  - current value: ${valuePreview}\n  - patch path: /${key}/value`);
          valuesSnapshot[key] = val;
        }
        const guardrails = [
          "State is the single source of truth.",
          "When answering questions about state, use the exact values shown above.",
          "If 'checked' and 'options' exist and the user asks about completed vs remaining items:",
          "- completed = states.checked.value (exact string match)",
          "- remaining = states.options.value minus states.checked.value",
          "Do not guess or drop items. Preserve the exact strings from state."
        ].join("\n");
        const content =
          `State fields (edit at '/<field>/value'):\n${lines.join('\n')}\n\nWhen the user asks to change state, call tool "state_delta" with JSON Patch (RFC6902).\n- Paths MUST be '/<field>/value' exactly (no deeper paths).\n- Use 'replace' for existing keys, 'add' for new keys.\n- Preserve types (arrays stay arrays, strings stay strings).\n\n${guardrails}\n\nState JSON snapshot (values only):\n\n\`\`\`json\n${JSON.stringify(valuesSnapshot)}\n\`\`\``;
        return { role: 'system', content } as const;
      })()
      : null;

    const messages_ = [
      baseSystem,
      ...(contextSystem ? [contextSystem] : []),
      ...(stateSystem ? [stateSystem] : []),
      ...input.messages.map((item: Message) => {
        const suffix = process.env.MESSAGE_SUFFIX ?? "";
        const shouldAppendSuffix = item.role === "user"; // 仅对用户消息追加后缀，避免破坏 tool JSON
        return {
          ...item,
          content: (item?.content ?? "") + (shouldAppendSuffix ? suffix : "")
        };
      }),
    ];

    console.log("messages_", messages_);
    eventService.sendStepStarted("LOADING");



    const userInputTools: OpenAITool[] = input.tools?.map((item: any) => {
      // 如果 parameters 是数组（如 setTheme 的入参风格），转换为 JSON Schema 对象
      const parametersSchema = Array.isArray(item?.parameters)
        ? (() => {
          const properties: Record<string, any> = {};
          const required: string[] = [];

          for (const param of item.parameters as any[]) {
            if (!param?.name) continue;
            const propertySchema: Record<string, any> = {};

            // 类型推断：若无显式类型，默认 string
            if (param.type) propertySchema.type = param.type;
            else propertySchema.type = "string";

            if (param.description) propertySchema.description = param.description;
            if (param.enum) propertySchema.enum = param.enum;
            if (param.default !== undefined) propertySchema.default = param.default;
            if (param.items) propertySchema.items = param.items;

            properties[param.name] = propertySchema;
            if (param.required) required.push(param.name);
          }

          const schema: any = {
            type: "object",
            properties
          };
          if (required.length) schema.required = required;
          return schema;
        })()
        : item?.parameters;

      return {
        type: "function",
        function: {
          name: item.name,
          description: item.description,
          parameters: parametersSchema
        }
      } as OpenAITool;
    }) ?? [];



    // 内置状态变更工具（由大模型在需要时调用）
    const stateDeltaTool: OpenAITool = {
      type: "function",
      function: {
        name: "state_delta",
        description: "Call when the user wants to modify state. Provide JSON Patch ops (RFC6902). Use 'replace' for existing keys, 'add' for new. Paths MUST be '/<field>/value' exactly.",
        parameters: {
          type: "object",
          properties: {
            delta: {
              type: "array",
              description: "JSON Patch ops to apply to state",
              items: {
                type: "object",
                properties: {
                  op: { type: "string", enum: ["add", "replace", "remove"] },
                  path: { type: "string", description: "Must be '/<field>/value'" },
                  value: {}
                },
                required: ["op", "path"]
              }
            }
          },
          required: ["delta"]
        }
      }
    };

    const tools = [
      ...(((availableTools as OpenAITool[] | undefined) ?? [])),
      ...((userInputTools as OpenAITool[]) ?? []),
      stateDeltaTool
    ];

    // console.log("userInputTools", JSON.stringify(tools, null, 2));
    // console.log("tools", tools);


    // 过滤/转换不受支持的 role: "tool"，并注入可读的工具调用轨迹
    const sanitizedMessages = sanitizeMessagesForOpenAI(messages_ as any);

    // 通过工具调用 state_delta 来完成状态修改的识别与下发

    // 调用 AI 并获取流式响应
    const stream = await AIService.createChatCompletion(sanitizedMessages as any, tools);
    eventService.sendStepFinished("LOADING");

    eventService.sendStepStarted("SEARCH_KNOWLEDGE");
    eventService.sendStepFinished("SEARCH_KNOWLEDGE");

    eventService.sendStepStarted("RERANK");
    eventService.sendStepFinished("RERANK");
    // eventService.sendCustomEvent("LOADING", 'qa_loading');

    let toolCallContent: ToolCallAggregate | null = null;
    let isToolCall = false;
    const messageId = `msg_${Date.now()}`;
    let messageStarted = false;
    // 兜底：当模型无任何文本增量输出时，给出简短说明与下一步建议
    const fallbackText = (() => {
      try {
        const ctxText = (contextSystem?.content || "") + "\n" + (stateSystem?.content || "");
        const userTextConcat = (input.messages || [])
          .filter((m: any) => m?.role === "user" && typeof m?.content === "string")
          .map((m: any) => m.content)
          .join("\n");
        const looksZh = /zh\b|中文|简体/.test(ctxText) || /[\u4e00-\u9fa5]/.test(userTextConcat);
        if (looksZh) {
          return "抱歉，本次请求未生成可用内容。可能原因：上下文不充分、内容被过滤或模型临时无响应。建议：重试、缩短或具体化问题，或稍后再试。";
        }
        return "Sorry, no content was generated. Possible reasons: insufficient context, content filtering, or a temporary model issue. Try again, be more specific, or retry later.";
      } catch {
        return "抱歉，本次未生成内容，请稍后重试或具体化问题。";
      }
    })();

    // 处理流式响应
    for await (const chunk of (stream as unknown as AsyncIterable<OpenAIStreamChunk>)) {
      const choice = chunk?.choices?.[0];
      if (!choice) continue;

      console.log("choice", JSON.stringify(choice, null, 2));

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
        } else if (!isToolCall) {
          // 未产生任何文本输出，发送兜底说明
          eventService.sendTextMessage(fallbackText, messageId);
        }
        // 没有工具调用，结束
        if (!isToolCall) {
          eventService.end();
          return;
        }
      }
    }

    // 如果不是工具调用，结束响应并返回
    if (!isToolCall) {
      // 兜底：循环退出但仍无文本
      if (!messageStarted) {
        eventService.sendTextMessage(fallbackText, messageId);
      }
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

        // 内置状态变更工具：直接下发 STATE_DELTA 事件
        if (toolName === "state_delta") {
          try {
            const cleanedArgs = cleanToolArgs(toolArgs);
            let parsed = {} as any;
            try {
              parsed = JSON.parse(cleanedArgs);
            } catch (jsonError) {
              throw new Error(`Invalid JSON for state_delta tool: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}\nReceived: ${cleanedArgs}`);
            }
            const delta = Array.isArray(parsed) ? parsed : parsed?.delta;
            if (!Array.isArray(delta)) {
              throw new Error("state_delta requires an array at root or at 'delta' property");
            }
            // 基础校验
            const sanitized = delta.filter((op) => op && typeof op === 'object' && typeof op.op === 'string' && typeof op.path === 'string');
            if (!sanitized.length) throw new Error("Empty or invalid patch operations");

            // 严格校验 path 格式为 '/<field>/value'
            const pathRegex = /^\/[A-Za-z0-9_-]+\/value$/;
            for (const op of sanitized) {
              if (!pathRegex.test(op.path)) {
                throw new Error(`Invalid JSON Patch path: ${op.path}. Path MUST be '/<field>/value'.`);
              }
            }

            // 根据当前状态数据结构，对值进行类型约束（数组与字符串保持一致）
            const normalized = normalizePatchWithStateType(input.state, sanitized);

            eventService.sendStateDelta(normalized);

            // 轻量确认
            eventService.sendTextMessage("已根据你的请求更新状态。", messageId);
          } catch {
            eventService.sendTextMessage("解析或应用状态变更失败。", messageId);
          }
          continue; // 不走外部工具分支
        }

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
            // eventService.sendTextMessage(`Calling tool ${serverName}.${functionName}`, messageId);

            const argsForConfirmText = JSON.stringify(parsedArgs);
            const toolConfirmMessages = [
              { role: "system", content: "Confirm the tool action briefly. State what was done and key parameters. Match the user's language. Keep it short." },
              ...(contextSystem ? [contextSystem as any] : []),
              { role: "system", content: `Tool: ${toolName}. Params: ${argsForConfirmText}` }
            ] as any[];

            const callStream = await AIService.createChatCompletion(toolConfirmMessages);
            for await (const chunk of callStream as any) {
              const content = chunk.choices[0];
              if (content.delta?.content) {
                eventService.sendTextMessage(content.delta.content, messageId);
              }
            }

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

              eventService.sendTextMessage(`Call tool end ${serverName}.${functionName}`, messageId);

              // 如果是自定义事件（如音乐播放），发送自定义事件
              if (toolResult?._meta?.type === "custom") {
                const name = (toolResult as any)._meta?.name as string | undefined;
                eventService.sendCustomEvent((name ?? "LOADING") as any, (toolResult as any)._meta?.value);
              }
            }
          } catch (toolError) {
            console.error(`工具 ${serverName}.${functionName} 调用失败: `, toolError);
            // 发送工具调用结果
            const toolCallId = toolCall.id ?? `${toolName}_${toolCall.index}`;
            eventService.sendToolCallEnd(
              toolName,
              {},
              toolCallId
            );
            eventService.sendTextMessage(`工具 ${serverName}.${functionName} 调用失败`, messageId);
          }
        } else if (userInputTools?.find(item => item.function.name === toolName)) {
          const toolCallId = toolCall.id ?? `${toolName}_${toolCall.index}`;
          eventService.sendToolCallStart(toolName, toolArgs, toolCallId);
          eventService.sendToolCallArgs(toolCallId, JSON.stringify(toolArgs));
          eventService.sendToolCallEnd(toolName, toolArgs, toolCallId);
          // 调用大模型，组合一下参数和用户的 messages 内容，再发送给大模型
          const toolConfirmMessages2 = [
            { role: "system", content: "Confirm the tool action briefly. State what was done and key parameters. Match the user's language. Keep it short." },
            ...(contextSystem ? [contextSystem as any] : []),
            { role: "system", content: `Tool: ${toolName}. Params: ${toolArgs}` }
          ] as any[];

          const stream = await AIService.createChatCompletion(toolConfirmMessages2);
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