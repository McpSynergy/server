// AG-UI 事件类型定义
export enum EventType {
  // 文本消息事件
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",
  TEXT_MESSAGE_CHUNK = "TEXT_MESSAGE_CHUNK",


  // 工具调用事件
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
  TOOL_CALL_END = "TOOL_CALL_END",
  TOOL_CALL_RESULT = "TOOL_CALL_RESULT",

  // 思考事件
  THINKING_START = "THINKING_START",
  THINKING_END = "THINKING_END",

  // 状态事件
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
  STATE_DELTA = "STATE_DELTA",
  MESSAGES_SNAPSHOT = "MESSAGES_SNAPSHOT",

  // 其他事件
  RAW = "RAW",
  CUSTOM = "CUSTOM",
  RUN_STARTED = "RUN_STARTED",
  RUN_FINISHED = "RUN_FINISHED",
  RUN_ERROR = "RUN_ERROR",
  STEP_STARTED = "STEP_STARTED",
  STEP_FINISHED = "STEP_FINISHED"
}

// 基础事件接口
export interface BaseEvent {
  type: EventType;
  timestamp?: number;
  rawEvent?: any;
}

// 运行事件
export interface RunStartedEvent extends BaseEvent {
  type: EventType.RUN_STARTED;
  threadId: string;
  runId: string;
}

export interface RunFinishedEvent extends BaseEvent {
  type: EventType.RUN_FINISHED;
  threadId: string;
  runId: string;
}

export interface RunErrorEvent extends BaseEvent {
  type: EventType.RUN_ERROR;
  message: string;
}

// 文本消息事件
export interface TextMessageStartEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_START;
  messageId: string;
  role: "assistant";
}

export interface TextMessageContentEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_END;
  messageId: string;
}

export interface TextMessageChunkEvent extends BaseEvent {
  type: EventType.TEXT_MESSAGE_CHUNK;
  messageId?: string;
  role?: "assistant";
  delta?: string;
}

// 工具调用事件
export interface ToolCallStartEvent extends BaseEvent {
  type: EventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent extends BaseEvent {
  type: EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent extends BaseEvent {
  type: EventType.TOOL_CALL_END;
  toolCallId: string;
}

// export interface ToolCallChunkEvent extends BaseEvent {
//   type: EventType.TOOL_CALL_CHUNK;
//   toolCallId: string;
//   delta: string;
// }

export interface ToolCallResultEvent extends BaseEvent {
  type: EventType.TOOL_CALL_RESULT;
  toolCallId: string;
  toolCallName: string;
  content: string;
  messageId: string;
  role?: "tool"
}

// 自定义事件
export interface CustomEvent extends BaseEvent {
  type: EventType.CUSTOM;
  name: string;
  value: any;
}

// 工具类型定义
export interface Tool {
  name: string;
  description?: string;
  parameters?: any;
}

// 消息类型定义
export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "developer";
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

// 运行输入参数
export interface RunAgentInput {
  threadId: string;
  runId?: string;
  messages: Message[];
  state?: any;
  tools?: Tool[];
  context?: any;
  forwardedProps?: any;
}

// 步骤事件
export type StepStartedEvent = BaseEvent & {
  type: EventType.STEP_STARTED
  stepName: string
}

export type StepFinishedEvent = BaseEvent & {
  type: EventType.STEP_FINISHED
  stepName: string
}

// 事件发送函数类型
export type SendEventFunction = {
  (event: BaseEvent): void;
  (eventType: EventType, data: any): void;
};

export type StateDeltaEvent = BaseEvent & {
  type: EventType.STATE_DELTA
  delta: any[] // JSON Patch operations (RFC 6902)
}



export type CustomEventName = "LOADING" | "TOOL_PERMISSION_REQUEST" | "TOOL_PERMISSION_ALLOWED" | "TOOL_PERMISSION_REJECTED" | "TOOL_PERMISSION_TIMEOUT"
