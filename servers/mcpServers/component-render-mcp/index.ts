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


const searchMovie = async (keyword: string) => {
  const response = await fetch(
    `http://192.168.78.14:9999/ugreen/v1/video/search?language=zh-CN&search_type=1&offset=0&limit=200&keyword=${encodeURIComponent(keyword)}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "client-id": "fb2e26f4-4c37-46d5-9392-WEB",
        "client-version": "1",
        "ug-agent": "PC/WEB",
        "x-specify-language": "zh-CN",
        "x-ugreen-security-key": "402d77731d23cc6e9e927bc4b9c79767",
        "x-ugreen-token": "dqWRUy8ay2WdM/PgAkwiYi4Ka59g5x9QHATQZd4HeM/uB/u+pnH+ffGOOcL+petRjcadzoglHCH7Av3LaP9vzkGmAo1DsMRlyOdlgMBBxNE9NMCS3+YcGVB/QQxDQU/LyKiYpKjZ5X9qc+y4nxJkeymxbgO9omb0kPBO5hOB0s5Wnn5HlVSBz1QfM/7gUWBOfWak8vy9D/G/I7Zwr7YdUyuGJUhc78Bm5tOKU+UzVWwoUb8RtuJKQ0ZaZh4DLOk1nPh9/NdRZpd4S2GnbpC5qQES+rGFs/NpMsgvzcBPCLzTR6VCwsIGem4UQ8zmYgoquNdMXGe2eXKdyF1iKi58FA==",
      },
      body: null,
      method: "GET",
    },
  );
  const data = await response.json();
  const tv_list = data.data.tv_list?.video_arr ?? []
  const movie_list = data.data.movies_list?.video_arr ?? []
  // @ts-ignorew
  return [...movie_list, ...tv_list];
}

const createFileSearchTask = async (keyword: string) => {
  const response = await fetch("http://192.168.78.14:9999/ugreen/v2/filemgr/createsearchtask", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "client-id": "b64fa72e-c48f-4f4e-8756-WEB",
      "client-version": "1",
      "content-type": "application/json",
      "ug-agent": "PC/WEB",
      "x-specify-language": "zh-CN",
      "x-ugreen-security-key": "402d77731d23cc6e9e927bc4b9c79767",
      "x-ugreen-token": "dqWRUy8ay2WdM/PgAkwiYi4Ka59g5x9QHATQZd4HeM/uB/u+pnH+ffGOOcL+petRjcadzoglHCH7Av3LaP9vzkGmAo1DsMRlyOdlgMBBxNE9NMCS3+YcGVB/QQxDQU/LyKiYpKjZ5X9qc+y4nxJkeymxbgO9omb0kPBO5hOB0s5Wnn5HlVSBz1QfM/7gUWBOfWak8vy9D/G/I7Zwr7YdUyuGJUhc78Bm5tOKU+UzVWwoUb8RtuJKQ0ZaZh4DLOk1nPh9/NdRZpd4S2GnbpC5qQES+rGFs/NpMsgvzcBPCLzTR6VCwsIGem4UQ8zmYgoquNdMXGe2eXKdyF1iKi58FA==",
      "Referer": "http://192.168.78.14:9999/filemgr/?_filemgr=4295926a"
    },
    "body": JSON.stringify({
      keyword,
      page: 1,
      limit: 1000,
      search_only: false,
      date_type: 1,
      search_path: ["/volume1/cy"]
    }),
    "method": "POST"
  });
  const data = await response.json();
  return data.data.result as string
}

const getFileSearchResult = async (taskId: string) => {
  const response = await fetch("http://192.168.78.14:9999/ugreen/v2/filemgr/getsearchtaskresult", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "client-id": "b64fa72e-c48f-4f4e-8756-WEB",
      "client-version": "1",
      "content-type": "application/json",
      "ug-agent": "PC/WEB",
      "x-specify-language": "zh-CN",
      "x-ugreen-security-key": "402d77731d23cc6e9e927bc4b9c79767",
      "x-ugreen-token": "dqWRUy8ay2WdM/PgAkwiYi4Ka59g5x9QHATQZd4HeM/uB/u+pnH+ffGOOcL+petRjcadzoglHCH7Av3LaP9vzkGmAo1DsMRlyOdlgMBBxNE9NMCS3+YcGVB/QQxDQU/LyKiYpKjZ5X9qc+y4nxJkeymxbgO9omb0kPBO5hOB0s5Wnn5HlVSBz1QfM/7gUWBOfWak8vy9D/G/I7Zwr7YdUyuGJUhc78Bm5tOKU+UzVWwoUb8RtuJKQ0ZaZh4DLOk1nPh9/NdRZpd4S2GnbpC5qQES+rGFs/NpMsgvzcBPCLzTR6VCwsIGem4UQ8zmYgoquNdMXGe2eXKdyF1iKi58FA==",
      "Referer": "http://192.168.78.14:9999/filemgr/?_filemgr=4295926a"
    },
    "body": JSON.stringify({
      sort_type: 1,
      reverse: false,
      limit: 2000,
      task_id: taskId,
      page: 1
    }),
    "method": "POST"
  });
  const data = await response.json();
  return data.data.files as any[]
}

export const musicList = [
  {
    path: '/home/wisen/Music/各类格式音乐/00 20kbps_wma_春之歌.wma',
    name: '春之歌',
    ext: 'wma',
    type: 'audio',
    desc: '春之歌，WMA格式音频，比特率20kbps，一首描绘春天美好的古典音乐作品。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/01 黑神话：悟空 主题音乐 (Black Myth Wukong Main Title).flac',
    name: '黑神话：悟空 主题音乐',
    ext: 'flac',
    type: 'audio',
    desc: '游戏《黑神话：悟空》的主题音乐，FLAC无损音质，展现了中国传统音乐元素与现代游戏配乐的完美融合。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/002.李宗盛-山丘.wma',
    name: '山丘-李宗盛',
    ext: 'wma',
    type: 'audio',
    desc: '李宗盛创作的《山丘》，WMA格式，一首充满人生感悟的经典作品，讲述了对生命历程的深刻思考。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/02dsf Air.dsf',
    name: 'Air',
    ext: 'dsf',
    type: 'audio',
    desc: 'Air，DSF格式的高解析度音频文件，DSF是DSD音频的一种存储格式，能提供极高的音质表现。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/03 WMA音频无损_921kbps 故乡的云 东方神秘园组合.wma',
    name: '故乡的云-东方神秘园组合',
    ext: 'wma',
    type: 'audio',
    desc: '东方神秘园组合演绎的《故乡的云》，WMA无损格式，比特率921kbps，音质优秀，富有东方韵味的音乐作品。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/03.北京欢迎你.DTS',
    name: '北京欢迎你',
    ext: 'dts',
    type: 'audio',
    desc: '《北京欢迎你》，2008年北京奥运会主题曲之一，DTS格式，提供5.1声道环绕音效，由众多华语歌手共同演绎。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/11-01.友谊之光-Maria Cordero.wma',
    name: '友谊之光-Maria Cordero',
    ext: 'wma',
    type: 'audio',
    desc: 'Maria Cordero演唱的《友谊之光》，WMA格式，一首歌颂友谊的温暖歌曲。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/DTS蔡琴.-.[常青树.CD1].专辑.dts',
    name: '常青树CD1-蔡琴',
    ext: 'dts',
    type: 'audio',
    desc: '蔡琴《常青树》专辑CD1，DTS格式，收录了多首蔡琴的经典作品，音质细腻，声场宽广。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/G.E.M.邓紫棋 - 喜欢你.flac',
    name: '喜欢你-邓紫棋',
    ext: 'flac',
    type: 'audio',
    desc: '邓紫棋演唱的《喜欢你》，FLAC无损格式，展现了歌手强劲的声线和情感表达。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/High歌-黄龄.dts',
    name: 'High歌-黄龄',
    ext: 'dts',
    type: 'audio',
    desc: '黄龄演唱的《High歌》，DTS格式，展现了歌手独特的音色和现代流行音乐元素。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/海阔天空.ape',
    name: '海阔天空-Beyond',
    ext: 'ape',
    type: 'audio',
    desc: 'Beyond乐队的经典作品《海阔天空》，APE无损格式，这首歌传递了追求梦想、永不放弃的精神。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/麦浚龙 _ 如果可以待你好 _ 20021201 _ 【贝壳音乐 环绕5.1声道】.wav',
    name: '如果可以待你好-麦浚龙',
    ext: 'wav',
    type: 'audio',
    desc: '麦浚龙演唱的《如果可以待你好》，WAV格式，5.1环绕声，2002年12月1日发行，音质完美还原。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/仙剑奇侠传四精选音乐辑CD.ape',
    name: '仙剑奇侠传四精选音乐辑',
    ext: 'ape',
    type: 'audio',
    desc: '游戏《仙剑奇侠传四》的精选音乐集，APE无损格式，收录了游戏中的经典配乐。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/杨子为 - 越来越不懂（Cover 蔡健雅）.m4a',
    name: '越来越不懂-杨子为',
    ext: 'm4a',
    type: 'audio',
    desc: '杨子为翻唱蔡健雅的《越来越不懂》，M4A格式，一首富有感染力的翻唱作品。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/周杰伦 - 简单爱.wma',
    name: '简单爱-周杰伦',
    ext: 'wma',
    type: 'audio',
    desc: '周杰伦的经典作品《简单爱》，WMA格式，收录在专辑《范特西》中，展现了周杰伦独特的音乐才华。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/周杰伦 - 一点点.flac',
    name: '一点点-周杰伦',
    ext: 'flac',
    type: 'audio',
    desc: '周杰伦演唱的《一点点》，FLAC无损格式，周杰伦创作的一首情歌。',
  },
  {
    path: '/home/wisen/Music/各类格式音乐/周杰伦.JAY.mka',
    name: 'JAY-周杰伦',
    ext: 'mka',
    type: 'audio',
    desc: '周杰伦的专辑《JAY》，MKA格式，这是周杰伦的首张专辑，奠定了他的音乐风格。',
  }
]

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
        const movieList = await searchMovie(title)
        if (!movieList?.length) {
          throw new McpError(ErrorCode.InvalidRequest, `movie not found，${JSON.stringify(movieList)}`);
        }
        const movie = movieList[0]
        const description = movie.video_info.introduction
        const id = movie.video_info.ug_video_info_id
        const name = movie.video_info.name
        const poster = movie.video_info.poster_path
        const year = movie.video_info.year
        const duration = movie.video_info.duration
        // duration 为秒，转成分钟
        const durationMinutes = Math.floor(duration / 60)
        const rating = movie.video_info.score
        // 根据文件路径获取后缀
        const ext = movie.video_info.file_path[0].split('.').pop()
        const nasProps = {
          path: movie.video_info.file_path[0],
          name: name,
          ext,
          type: 'video',
        }
        return {
          content: [
            command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放 \`${title}\` 的影片` } : { type: "text", text: `已经生成了 \`${title}\` 的媒体卡片，点击即可跳转播放` },
          ],
          _meta: {
            // uuid
            messageId: uuidv4(),
            aiOutput: command !== 'none' ? { type: "text", text: `将自动为你打开播放器，播放\`${title}\` 的影片` } : { type: "text", text: `已经生成了 \`${title}\` 的媒体卡片，点击即可跳转播放` },
            props: {
              movie: {
                id,
                title: name,
                description,
                poster,
                year,
                duration: `${durationMinutes}分钟`,
                rating,
                genre: ['动作', '冒险', '科幻'],
                nasProps,
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
        // 创建文件搜索任务
        const taskId = await createFileSearchTask(title)
        const fileList = await getFileSearchResult(taskId)
        const musics = fileList.filter((file) => file.file_collation === 'audio')
        if (!musics?.length) {
          throw new McpError(ErrorCode.InvalidParams, `music not found`);
        }
        const id = musics[0].id
        const name = musics[0].name
        const artist = musics[0].artist ?? ""
        const path = musics[0].path
        const ext = path.split('.').pop()
        const nasProps = {
          path,
          name,
          ext,
          type: 'audio',
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
                id,
                title: name,
                artist,
                cover: 'https://tdesign.gtimg.com/site/avatar.jpg',
                duration: 180,
                name,
                nasProps,
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
