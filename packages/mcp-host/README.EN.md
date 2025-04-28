<p align="center">
  <a href="./README.md">中文</a> | EN
</p>

# mcp-host-use

### mcp-host-use is a Node.js-based Model Context Protocol (MCP) host application for connecting and managing multiple MCP servers. The Host provides a unified interface that allows clients to interact with multiple MCP servers through HTTP APIs, accessing and invoking tools (or resources). You can use it to quickly test and run your MCP Servers.

## Architecture Diagram

```mermaid
graph TD
    Client[Client] -->|HTTP Request| HostServer[MCP Host Server]
    HostServer -->|Manage| ConnectionManager[Connection Manager]
    ConnectionManager -->|Create/Manage| MCPClient1[MCP Client 1]
    ConnectionManager -->|Create/Manage| MCPClient2[MCP Client 2]
    ConnectionManager -->|Create/Manage| MCPClientN[MCP Client N]
    MCPClient1 -->|STDIO/SSE| MCPServer1[MCP Server 1]
    MCPClient2 -->|STDIO/SSE| MCPServer2[MCP Server 2]
    MCPClientN -->|STDIO/SSE| MCPServerN[MCP Server N]
```

## Key Features
- Support for connecting multiple MCP servers simultaneously, managed through a `json` file
- Support for both STDIO and SSE transport methods
- Provides unified HTTP API interfaces for:
    - Retrieving tool lists from all servers
    - Invoking tools on specific servers
    - Getting resource lists from all servers
    - Accessing resources from specific servers
    - Triggering Host to actively update Server connections

## Project Structure
```bash
mcp-host-use/
├── src/                      # Source code directory
│   ├── main.ts               # Main entry file
│   ├── host.ts               # MCP connection manager
│   ├── client.ts             # MCP client implementation
│   ├── server.ts             # HTTP server implementation
│   ├── types.ts              # Type definitions
│   └── utils.ts              # Utility functions
```

## Requirements
- **For connecting to STDIO MCP Server, requires `npx` or `uvx` system runtime environment.**
  - `npx` requires Nodejs (>=18)
  - `uvx` requires Python (uv)

## Usage

### 1. Installation

```bash
npm install @mcp-synergy/host
```

### 2. Usage

```typescript
import { MCPHost } from '@mcp-synergy/host';

// Create MCPHost instance
// param1: config file path
// param2: enable config file hot reload (recommended for development mode)
const mcpHost = new MCPHost('./mcp_servers.config.json', true);

// Start service
await mcpHost.start();
```

### 3. Local Development

1. Clone repository
```bash
git clone <repository_url>
cd mcp-host
```

2. Install dependencies
```bash
npm install
```

3. Development mode
```bash
npm run dev
```

## Servers Configuration File

`mcp-host-use` reads the `mcp_servers.config.json` file from the **current working directory**, with the following format:

```json
{
    "mcp_servers": [
        {
            "enabled": true, // Whether to enable the server
            "type": "stdio", // 'stdio' | 'sse'
            "server_name": "server-puppeteer", // Custom name
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-puppeteer"
            ]
        },
        {
            "enabled": true,
            "type": "sse",
            "server_name": "server-everything-sse",
            "sse_url": "http://localhost:3001/sse"
        },
        {
            "enabled": true,
            "type": "stdio",
            "server_name": "github",
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-github"
            ],
            "env": { // Supports environment variable configuration
                "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
            }
        }
    ]
}
```

## Notes
- For STDIO transport method, ensure the following commands are executable:
    - `npx`
    - `uvx`
- For SSE transport method, ensure the URL is accessible
- Development mode supports hot reload of configuration files
- Production environment is recommended to disable configuration file hot reload

## API Endpoints

## Tools

### 1. Get All Tools List

```typescript
// Get all available tools list
const toolsList = await mcp.getTools()
// Example response:
[
  {
    server_name: "server1",
    tools: [
      {
        name: "tool name",
        description: "tool description",
        inputSchema: { ... }
      }
    ]
  }
]
```

### 2. Invoke Tool

```typescript
// Call tool on specified server
const result = await mcp.toolCall({
  serverName: "server name",
  toolName: "tool name",
  toolArgs: { ... }
})
// Returns tool execution result
```

## Resources

### 1. Get All Resources List

```typescript
// Get all available resources list
const resourcesList = await mcp.getResources()
// Example response:
[
  {
    server_name: "server1",
    resources: [
      {
        uri: "resource URI",
        mimeType: "resource MIME type",
        name: "resource name"
      }
    ]
  }
]
```

### 2. Read Specific Resource

```typescript
// Read resource from specified server
const resource = await mcp.readResource({
  serverName: "server name",
  resourceUri: "resource URI"
})
// Example response:
{
  mimeType: "resource MIME type",
  text: "resource content",
  blob: Blob
}
```

## Connections

### 1. Update Server Connection

> **After calling this method, the Host will actively read the configuration file and create/restart/delete Server connections based on the updated configuration. No need to restart the Host service, continue using other methods to get the updated Server information.**

```typescript
// Refresh server connections
await mcp.refreshConnections()
```
```

## License

MIT
