# AG-UI-Simple

English | [中文](README-ZH.md)
Build a complete project based on the AG-UI protocol.

## What it can do

- End‑to‑end AG‑UI sample: Express backend + Vue 3 frontend
- Streaming chat via OpenAI‑compatible APIs (SSE), configurable baseURL/model
- Tool calling via MCP Host; tools/components loaded from `backend/express/mcp_servers.config.json` and `backend/express/mcp_components.config.json`
- State sync through JSON Patch (RFC 6902) using built‑in `state_delta` tool
- Render interactive UI components from tool results with `@mcp-synergy/vue` (e.g. media cards)
- Request signature verification middleware (HMAC‑SHA256 via `x-signature` header)
- Ready‑to‑run scripts (pnpm); Vite dev server on 5173, backend on 3000

## Quick Start

- Requirements: pnpm, Node.js 18+ (20+ recommended)

1. Install dependencies (project root)

```bash
pnpm install:all
```

2. Create `.env` under `backend/express`

```bash
# OpenAI-compatible configuration (sample values; replace with your own)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Server port
PORT=3000

# Optional: suffix to append to user messages
MESSAGE_SUFFIX=

# Signature secret (currently fixed to: d2ViU2lnbmF0dXJlU2VjcmV0XzE3MDkyNTQ1Njg2NDQ3)
SECRET=d2ViU2lnbmF0dXJlU2VjcmV0XzE3MDkyNTQ1Njg2NDQ3
```

3. Start backend and frontend (run in two terminals at project root)

```bash
pnpm dev:backend
pnpm dev:frontend
```

4. Open in browser

`http://localhost:5173/`

Tip: If you get 401 (signature failed), make sure `SECRET` in `.env` matches the frontend `x-signature` header; or temporarily relax the check during local development in `backend/express/src/middleware/signatureMiddleware.ts`.
