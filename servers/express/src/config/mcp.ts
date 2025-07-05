import { MCPHost } from "@mcp-synergy/host";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mcpHost = new MCPHost({
  mcpServer: {
    configPath: path.join(__dirname, "..", "..", "mcp_servers.config.json"),
  },
  mcpComponent: {
    configPath: path.join(__dirname, "..", "..", "mcp_components.config.json")
  },
  watch: process.env.NODE_ENV !== 'production'
}); 