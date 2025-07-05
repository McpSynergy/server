import { Router } from "express";
import { ThinkingService } from "../services/thinkingService";
import { UnifiedApiResponse } from "../types";

const router = Router();

// 专门的思考接口
// @ts-ignore
router.post("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const {
      thought,
      thoughtNumber = 1,
      totalThoughts = 1,
      nextThoughtNeeded = false,
      isRevision = false,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts = false
    } = req.body;

    if (!thought) {
      const errorResponse = {
        code: 400,
        message: "思考内容不能为空"
      };
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
      return;
    }

    const result = await ThinkingService.processThinkingUnified({
      thought,
      thoughtNumber,
      totalThoughts,
      nextThoughtNeeded,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts
    });

    const response: UnifiedApiResponse = {
      code: 0,
      data: result
    };

    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
  } catch (error) {
    console.error("思考处理错误:", error);
    const errorResponse = {
      code: 500,
      message: "思考处理失败",
      error: error instanceof Error ? error.message : String(error)
    };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

export { router as thinkRouter }; 