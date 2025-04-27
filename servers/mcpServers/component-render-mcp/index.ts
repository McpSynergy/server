import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

export class MCPRenderComponent {
  tools = new Map<string, Tool>();
  server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-component-render',
        version: '1.0.0',
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
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  public updateTools(tools: Tool[]) {
    this.tools.clear();

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request.params.name, request.params.arguments ?? {}),
    );
  }
  /**
   * Handles tool call requests
   */
  async handleToolCall(name: string, props: any): Promise<CallToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Component ${name} not found`,
        {
          code: ErrorCode.MethodNotFound,
          message: `Component ${name} not found`,
        },
      );
    }

    return {
      content: [],
      meta: {
        name,
        props,
      },
      isError: false,
    };
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
      console.error('Error while stopping server:', error);
    }
  }
}

const server = new MCPRenderComponent();

// Main execution
async function main() {
  try {
    await server.start();
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal server error:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
