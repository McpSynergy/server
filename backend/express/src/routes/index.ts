import { Router } from "express";
import { configRouter } from "./config";
import { messageRouter } from "./message";
import { permissionRouter } from "./permission";

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
router.use("/api/config", configRouter);
router.use("/ugreen/v1/message", messageRouter);
router.use("/ugreen/v1/permission", permissionRouter);

export { router as mainRouter }; 