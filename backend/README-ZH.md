# AG-UI-Simple

中文 | [English](README.md)

基于 AG-UI 协议构建的完整示例项目。

## 能力概览

- 端到端示例：Express 后端 + Vue 3 前端
- 基于 OpenAI 兼容接口的流式对话（SSE），可配置 baseURL 和模型
- 通过 MCP Host 调用工具；工具/组件来自 `backend/express/mcp_servers.config.json` 与 `backend/express/mcp_components.config.json`
- 通过内置 `state_delta` 工具以 JSON Patch（RFC 6902）实现状态同步
- 使用 `@mcp-synergy/vue` 将工具结果渲染成可交互组件（如媒体卡片）
- 请求签名校验中间件（HMAC-SHA256，使用 `x-signature` 头）
- 开箱即用脚本（pnpm）；Vite 默认 5173 端口，后端默认 3000 端口

## 快速启动

- 前置要求：已安装 pnpm，Node.js 18+（推荐 20+）

1. 在项目根目录安装依赖

```bash
pnpm install:all
```

2. 在 `backend/express` 下创建 `.env` 文件

```bash
# OpenAI 配置（示例值，自行替换）
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# 服务端口
PORT=3000

# 可选：为用户消息追加后缀
MESSAGE_SUFFIX=

# 签名校验密钥（当前固定为：d2ViU2lnbmF0dXJlU2VjcmV0XzE3MDkyNTQ1Njg2NDQ3）
SECRET=d2ViU2lnbmF0dXJlU2VjcmV0XzE3MDkyNTQ1Njg2NDQ3
```

3. 在项目根目录分别启动后端与前端（开启两个终端）

```bash
pnpm dev:backend
pnpm dev:frontend
```

4. 打开浏览器访问

`http://localhost:5173/`

提示：如返回 401（签名失败），请确保 `.env` 的 `SECRET` 与前端请求头 `x-signature` 一致；或在开发阶段临时放宽 `backend/express/src/middleware/signatureMiddleware.ts` 中的校验。
