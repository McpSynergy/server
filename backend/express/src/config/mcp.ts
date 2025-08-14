import { MCPHost } from "@mcp-synergy/host";

export const mcpHost = new MCPHost({
  mcpServer: {
    configPath: "./mcp_servers.config.json"
  },
  mcpComponent: {
    configPath: "./mcp_components.config.json"
  },
  watch: process.env.NODE_ENV !== 'production'
}); 