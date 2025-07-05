import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// 获取配置
router.get("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const config = fs.readFileSync(path.join(__dirname, "..", "..", "mcp_components.config.json"), "utf-8");
    const response = {
      code: 0,
      data: JSON.parse(config),
    };
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error reading config:", error);
    const errorResponse = {
      code: 500,
      message: "Failed to read config",
      error: error instanceof Error ? error.message : String(error)
    };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

// 更新配置
router.post("/", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { config } = req.body;

    // 将 config 保存在项目的根路径
    fs.writeFileSync(
      path.join(__dirname, "..", "..", "mcp_components.config.json"),
      JSON.stringify(config, null, 2)
    );

    const response = {
      code: 0,
      data: config,
    };
    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error updating MCP connections:", error);
    const errorResponse = {
      code: 500,
      message: "Failed to update MCP connections",
      error: error instanceof Error ? error.message : String(error)
    };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

export { router as configRouter }; 