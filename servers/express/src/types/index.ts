export interface ThinkingRequest {
  thought: string;
  thoughtNumber?: number;
  totalThoughts?: number;
  nextThoughtNeeded?: boolean;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}

export interface ThinkingResponse {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  isRevision: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts: boolean;
  result: string;
  rawResult: any;
}

export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
  error?: string;
}

export interface MessageRequest {
  messages: Array<{
    role: "system" | "user" | "assistant" | "function" | "tool";
    content: string;
  }>;
}

export interface ToolCallResult {
  serverName: string;
  toolName: string;
  componentProps?: any;
  messageId?: string;
  aiOutput: string;
}

export interface ToolMeta {
  serverName: string;
  toolName: string;
  componentProps?: any;
  aiOutput: string;
  messageId?: string;
  isPartial?: boolean;
  isComplete?: boolean;
  toolCallResult?: ToolCallResult;
  thinkingProcess?: {
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    statusInfo: any;
    isRevision: boolean;
    revisesThought?: number;
    branchFromThought?: number;
    branchId?: string;
  };
}

// 统一的响应数据结构
export interface UnifiedResponseData {
  content: string;
  meta: ToolMeta[];
}

// 统一的API响应格式
export interface UnifiedApiResponse extends ApiResponse<UnifiedResponseData> {
  data: UnifiedResponseData;
}

export interface SSEStepData {
  type: 'step' | 'progress' | 'error' | 'complete';
  step?: number;
  totalSteps?: number;
  content?: string;
  statusInfo?: any;
  completed?: boolean;
  message?: string;
} 