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

export const books = [
  {
    title: "Computing and Technology Ethics",
    author: "Emanuelle Burton, Judy Goldsmith, Nicholas Mattei",
    cover:
      "\thttps://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 45.99,
  },
  {
    title:
      "More than a Glitch: Confronting Race, Gender, and Ability Bias in Tech",
    author: "Meredith Broussard",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0262547260.01.L.jpg",
    price: 29.99,
  },
  {
    title: "Working with AI: Real Stories of Human-Machine Collaboration",
    author: "Thomas H. Davenport & Steven M. Miller",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0262047519.01.L.jpg",
    price: 32.99,
  },
  {
    title:
      "Quantum Supremacy: How the Quantum Computer Revolution Will Change Everything",
    author: "Michio Kaku",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 28.99,
  },
  {
    title: "Business Success with Open Source",
    author: "VM (Vicky) Brasseur",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1680509551.01.L.jpg",
    price: 39.99,
  },
  {
    title: "The Internet Con: How to Seize the Means of Computation",
    author: "Cory Doctorow",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1804291277.01.L.jpg",
    price: 24.99,
  },
  {
    title:
      "How Infrastructure Works: Inside the Systems That Shape Our World",
    author: "Deb Chachra",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0593086430.01.L.jpg",
    price: 27.99,
  },
  {
    title: "Extremely Online: The Untold Story of Fame, Influence, and Power",
    author: "Taylor Lorenz",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1982146745.01.L.jpg",
    price: 26.99,
  },
  {
    title: "The Apple II Age: How the Computer Became Personal",
    author: "Laine Nooney",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 35.99,
  },
  {
    title:
      "Fancy Bear Goes Phishing: The Dark History of the Information Age",
    author: "Scott J. Shapiro",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 29.99,
  },
].map((book, index) => ({
  ...book,
  id: book.title + book.author,
}));


const getTools = () => {
  const tools = process.env.MCP_COMPONENT_CONFIG ? JSON.parse(process.env.MCP_COMPONENT_CONFIG) as any[] : [];
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema || {
      type: "object",
      properties: {},
      required: []
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
      case 'RecommendBook': {
        const { title, author } = args;
        let recommendBookList = []
        if (!title && !author) {
          recommendBookList = books.sort(() => Math.random() - 0.5).slice(0, 3)
        } else if (title && !author) {
          // 非常模糊的查找，比如输入“计算”，则返回所有包含“计算”的书籍
          recommendBookList = books.filter((book) => book.title.includes(title))
        } else if (!title && author) {
          recommendBookList = books.filter((book) => book.author.includes(author))
        } else {
          recommendBookList = books.filter((book) => book.title.includes(title) || book.author.includes(author))
        }
        return {
          content: [
            { type: "text", text: "show book list" },
          ],
          _meta: {
            aiOutput: {
              type: "text",
              content: `Recommend book list is starting to render...`,
            },
            props: {
              recommendedBooks: recommendBookList,
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
