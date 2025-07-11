import { mcpHost } from "../config/mcp";

export class MCPService {
  static async getAvailableTools() {
    const tools = await mcpHost.getTools();
    const toolsList = tools;

    console.log({
      toolsList: JSON.stringify(toolsList, null, 2)
    });

    const availableTools = toolsList?.reduce((pre, cur) => {
      if (cur?.tools?.length) {
        // @ts-ignore
        cur.tools.forEach((item) => {
          console.log(`${cur.server_name}_${item.name}`);

          // 确保 inputSchema 有效
          const inputSchema = item.inputSchema || {};
          const schemaType = inputSchema.type || "object";

          pre.push({
            type: "function",
            function: {
              name: `${cur.server_name}_${item.name}`,
              description: item?.description || "",
              parameters: {
                type: schemaType,
                required: inputSchema.required || [],
                properties: inputSchema.properties || {},
              },
            },
          });
        });
      }
      return pre;
    }, [] as any[]);

    console.log({
      availableTools: JSON.stringify(availableTools, null, 2)
    });

    return availableTools;
  }

  static async callTool(serverName: string, toolName: string, toolArgs: any) {
    return await mcpHost.toolCall({
      serverName,
      toolName,
      toolArgs,
    });
  }
} 