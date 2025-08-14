import { Router } from "express";
import { EventService } from "../services/eventService";
import type { RunAgentInput } from "../types/events";

const approvals = new Map<string, { allow: boolean; decidedAt: number }>();

const router = Router();

// 提交工具调用授权结果
router.post("/decide", (req, res) => {
  try {
    const { toolCallId, allow, threadId, runId } = req.body || {};
    if (!toolCallId || typeof allow !== "boolean") {
      res.status(400).json({ code: 400, message: "Invalid payload" });
      return;
    }
    approvals.set(String(toolCallId), { allow, decidedAt: Date.now() });
    // 发送一个自定义事件，通知前端更新该 toolCall 的状态
    try {
      // 伪造一个最小 eventService 以复用发送逻辑（仅需 threadId/runId 用于封装）
      const fakeRes = { write: () => { }, end: () => { } } as any;
      const fakeInput = { threadId: threadId ?? "", runId: runId ?? "" } as unknown as RunAgentInput;
      const es = new EventService(fakeRes, fakeInput);
      es.sendCustomEvent(allow ? "TOOL_PERMISSION_ALLOWED" : "TOOL_PERMISSION_REJECTED", { toolCallId });
    } catch { }
    res.json({ code: 0, message: "ok" });
  } catch (e) {
    res.status(500).json({ code: 500, message: e instanceof Error ? e.message : String(e) });
  }
});

// 查询工具调用授权结果（供服务端等待）
export const waitForApproval = async (toolCallId: string, timeoutMs = 120_000): Promise<boolean | null> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const decision = approvals.get(toolCallId);
    if (decision) return decision.allow;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null; // timeout
};

export { router as permissionRouter };


