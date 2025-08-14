import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from 'uuid';

// import tools from "./mcp-comp-schema.json";

function parseUnicodeEscape(str: string) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}



const getTools = () => {
  const tools = process.env.MCP_COMPONENT_CONFIG ? JSON.parse(process.env.MCP_COMPONENT_CONFIG) as any[] : [];
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
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
      case 'MediaCard': {
        const { title: title_, command } = args;
        const title = parseUnicodeEscape(title_)

        if (!title || !title.trim()) {
          throw new McpError(ErrorCode.InvalidParams, `title is required`);
        }

        return {
          content: [
            command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放 \`${title}\` 的影片` } : { type: "text", text: `已经生成了 \`${title}\` 的媒体卡片，点击即可跳转播放` },
          ],
          _meta: {
            messageId: uuidv4(),
            aiOutput: command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放\`${title}\` 的影片` } : { type: "text", text: `已经生成了 \`${title}\` 的媒体卡片，点击即可跳转播放` },
            props: {
              movie: {
                id: "123456",
                title,
                description: "这是一部精彩的示例电影，包含了精彩的剧情和视觉效果。",
                poster: "https://tdesign.gtimg.com/site/avatar.jpg",
                year: "2024",
                duration: "120分钟",
                rating: "9.0",
                genre: ['动作', '冒险', '科幻'],
                nasProps: {
                  path: "/movies/example.mp4",
                  name: "示例电影标题",
                  ext: "mp4",
                  type: "video"
                },
                command
              },
            },
          },
        };
      }
      case 'MusicCard': {
        const { title: title_, command } = args;
        const title = parseUnicodeEscape(title_)
        if (!title || !title.trim()) {
          throw new McpError(ErrorCode.InvalidParams, `title is required`);
        }

        return {
          content: [
            command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放 \`${title}\` 的歌曲` } : { type: "text", text: `已经生成了 \`${title}\` 的歌曲的媒体卡片，点击即可跳转播放` },
          ],
          _meta: {
            messageId: uuidv4(),
            aiOutput: command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放 \`${title}\` 的歌曲` } : { type: "text", text: `已经生成了 \`${title}\` 的歌曲的媒体卡片，点击即可跳转播放` },
            props: {
              musicData: {
                id: "789012",
                title,
                artist: "示例艺术家",
                cover: 'https://tdesign.gtimg.com/site/avatar.jpg',
                duration: 180,
                name: "示例音乐标题",
                nasProps: {
                  path: "/music/example.mp3",
                  name: "示例音乐标题",
                  ext: "mp3",
                  type: "audio"
                },
                command,
              },
            },
          },
        };
      }
      case "UserProfile": {
        const { name } = args;
        try {
          return {
            content: [
              {
                type: "text",
                text: `user name is ${name}`,
              },
            ],
            _meta: {
              aiOutput: {
                type: "text",
                content: `User name is \`${name}\`,Found UI related to \`${name}\` in your system, you will get a more comprehensive view of \`${name}\`'s information. UI is starting to render...`,
              },
              props: {
                user: {
                  name: name,
                  title: "Senior Developer",
                  avatar: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
                  email: `${name}@example.com`,
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
