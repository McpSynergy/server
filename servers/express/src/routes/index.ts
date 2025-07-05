import { Router } from "express";
import { booksRouter } from "./books";
import { thinkRouter } from "./think";
import { configRouter } from "./config";
import { messageRouter } from "./message";

const router = Router();

// 基础路由
router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const response = {
    code: 0,
    data: "Hello World!",
    message: "服务器运行正常"
  };

  res.write(`data: ${JSON.stringify(response)}\n\n`);
  res.end();
});

// 各功能模块路由
router.use("/books", booksRouter);
router.use("/think", thinkRouter);
router.use("/api/config", configRouter);
router.use("/message", messageRouter);

export { router as mainRouter }; 