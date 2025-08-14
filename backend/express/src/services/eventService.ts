import { Response } from 'express';
import {
  BaseEvent,
  EventType,
  RunAgentInput,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  CustomEvent,
  RunErrorEvent,
  RunStartedEvent,
  RunFinishedEvent,
  CustomEventName,
  StepStartedEvent,
  StepFinishedEvent
} from '../types/events';

export class EventService {
  private res: Response;
  private threadId: string;
  private runId: string;

  constructor(res: Response, input: RunAgentInput) {
    this.res = res;
    this.threadId = input.threadId;
    this.runId = input.runId || `run_${Date.now()}`;
  }

  private sendEvent(event: BaseEvent) {
    // 一条流
    this.res.write(`data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`);
  }

  // 运行事件
  public sendRunStarted() {
    const event: RunStartedEvent = {
      type: EventType.RUN_STARTED,
      threadId: this.threadId,
      runId: this.runId
    };
    this.sendEvent(event);
  }

  public sendRunFinished() {
    const event: RunFinishedEvent = {
      type: EventType.RUN_FINISHED,
      threadId: this.threadId,
      runId: this.runId
    };
    this.sendEvent(event);
  }

  public sendRunError(error: Error | string) {
    const event: RunErrorEvent = {
      type: EventType.RUN_ERROR,
      message: error instanceof Error ? error.message : error
    };
    this.sendEvent(event);
  }

  // 文本消息事件
  public sendTextMessage(content: string, messageId: string = `msg_${Date.now()}`) {
    // 发送消息开始事件
    const startEvent: TextMessageStartEvent = {
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: "assistant"
    };
    this.sendEvent(startEvent);

    // 发送消息内容事件
    const contentEvent: TextMessageContentEvent = {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: content ?? ''
    };
    this.sendEvent(contentEvent);

    // 发送消息结束事件
    const endEvent: TextMessageEndEvent = {
      type: EventType.TEXT_MESSAGE_END,
      messageId
    };
    this.sendEvent(endEvent);
  }

  public sendTextMessageStart(messageId: string) {
    const startEvent: TextMessageStartEvent = {
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: "assistant"
    };
    this.sendEvent(startEvent);
  }

  public sendTextMessageContent(messageId: string, delta: string) {
    const contentEvent: TextMessageContentEvent = {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: delta
    };
    this.sendEvent(contentEvent);
  }

  public sendTextMessageEnd(messageId: string) {
    const endEvent: TextMessageEndEvent = {
      type: EventType.TEXT_MESSAGE_END,
      messageId
    };
    this.sendEvent(endEvent);
  }
  // 工具调用事件
  public sendToolCallStart(
    toolName: string,
    args: any,
    toolCallId: string = `tool_${Date.now()}`,
    parentMessageId?: string
  ) {
    // 发送工具调用开始事件
    const startEvent: ToolCallStartEvent = {
      type: EventType.TOOL_CALL_START,
      toolCallId,
      toolCallName: toolName,
      parentMessageId
    };
    this.sendEvent(startEvent);
  }

  public sendToolCallArgs(toolCallId: string, delta: string) {
    const argsEvent: ToolCallArgsEvent = {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: delta
    };
    this.sendEvent(argsEvent);
  }

  public sendToolCallEnd(toolCallId: string) {
    const endEvent: ToolCallEndEvent = {
      type: EventType.TOOL_CALL_END,
      toolCallId
    };
    this.sendEvent(endEvent);
  }

  public sendToolCallResult(toolName: string, result: any, toolCallId: string) {
    const resultEvent: ToolCallResultEvent = {
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      toolCallName: toolName,
      messageId: toolCallId + "_" + Date.now(),
      content: typeof result === 'string' ? result : JSON.stringify(result),
      role: "tool"
    };
    this.sendEvent(resultEvent);
  }

  public sendStepStarted(stepName: string) {
    const event: StepStartedEvent = {
      type: EventType.STEP_STARTED,
      stepName,
    };
    this.sendEvent(event);
  }

  public sendStepFinished(stepName: string) {
    const event: StepFinishedEvent = {
      type: EventType.STEP_FINISHED,
      stepName
    };
    this.sendEvent(event);
  }


  // 自定义事件
  public sendCustomEvent(name: CustomEventName, value: any) {
    const event: CustomEvent = {
      type: EventType.CUSTOM,
      name,
      value
    };
    this.sendEvent(event);
  }

  // 发送工具权限请求事件
  public sendToolPermissionRequest(params: {
    toolCallId: string;
    toolName: string;
    serverName?: string;
    argsPreview?: string;
  }) {
    const { toolCallId, toolName, serverName, argsPreview } = params;
    this.sendCustomEvent("TOOL_PERMISSION_REQUEST", {
      toolCallId,
      toolName,
      serverName: serverName ?? "",
      argsPreview: argsPreview ?? "",
      runId: this.runId,
      threadId: this.threadId
    });
  }

  // 状态增量事件（JSON Patch）
  public sendStateDelta(delta: any[]) {
    const event = {
      type: EventType.STATE_DELTA,
      delta
    } as const;
    this.sendEvent(event);
  }

  // 结束响应
  public end() {
    this.sendRunFinished();
    this.res.end();
  }
}
