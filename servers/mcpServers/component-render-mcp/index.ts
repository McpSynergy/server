import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// import tools from "./mcp-comp-schema.json";

const getTools = () => {
  const tools = process.env.MCP_COMPONENT_CONFIG ? JSON.parse(process.env.MCP_COMPONENT_CONFIG) as any[] : [];
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: {
        userName: {
          type: "string",
          description: "User name",
        },
      },
      required: tool.propertySchema.required || []
    },
  }));
};

class MCPImageCompression {
  server: Server;
  constructor() {
    this.server = new Server(
      {
        name: "mcp-component-render",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.stop();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request.params.name, request.params.arguments ?? {}),
    );
  }
  /**
   * Handles tool call requests
   */
  private async handleToolCall(
    name: string,
    args: any,
  ): Promise<CallToolResult> {

    switch (name) {
      case "UserProfile": {
        const { userName } = args;
        try {
          return {
            content: [
              {
                type: "text",
                text: `user name is ${userName}`,
              },
            ],
            _meta: {
              aiOutput: {
                type: "text",
                content: `User name is \`${userName}\`,Found UI related to \`${name}\` in your system, you will get a more comprehensive view of \`${userName}\`'s information. UI is starting to render...`,
              },
              props: {
                user: {
                  name: userName,
                  title: "Senior Developer",
                  avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
                  email: `${userName}@example.com`,
                  phone: "+1 234 567 890",
                  skills: [{ name: "JavaScript", color: "gold" }],
                  stats: {
                    projects: 24,
                    followers: 1489,
                    following: 583,
                  },
                },
              },
            },
            isError: false,
          };
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }

          throw new McpError(
            ErrorCode.InternalError,
            `Failed to process transcript: ${(error as Error).message}`,
          );
        }
      }
      case "Cart": {
        return {
          content: [
            { type: "text", text: "Book list" },
          ],
          _meta: {
            aiOutput: {
              type: "text",
              content: `Cart is starting to render...`,
            },
            props: {
            },
          },
        };
      }
      default: {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`, {
          code: ErrorCode.MethodNotFound,
          message: `Tool ${name} not found`,
        });
      }
    }
  }
  /**
   * Starts the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
  /**
   * Stops the server
   */
  async stop(): Promise<void> {
    try {
      await this.server.close();
    } catch (error) {
      console.error("Error while stopping server:", error);
    }
  }
}

const server = new MCPImageCompression();

// Main execution
async function main() {
  try {
    await server.start();
  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
