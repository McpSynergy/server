const fs = require("fs");
const path = require("path");

// 测试配置文件路径
const componentConfigPath = path.join(
  __dirname,
  "servers/express/mcp_components.config.json",
);
const serverConfigPath = path.join(
  __dirname,
  "servers/express/mcp_servers.config.json",
);

console.log("=== 测试 MCP Component 配置加载 ===");

// 1. 检查配置文件是否存在
console.log("1. 检查配置文件存在性:");
console.log(
  "   Component config 文件:",
  fs.existsSync(componentConfigPath) ? "✓ 存在" : "✗ 不存在",
);
console.log(
  "   Server config 文件:",
  fs.existsSync(serverConfigPath) ? "✓ 存在" : "✗ 不存在",
);

// 2. 读取配置文件
try {
  const componentConfig = JSON.parse(
    fs.readFileSync(componentConfigPath, "utf-8"),
  );
  const serverConfig = JSON.parse(fs.readFileSync(serverConfigPath, "utf-8"));

  console.log("\n2. 配置文件内容:");
  console.log("   Component 配置数量:", componentConfig.length);
  console.log("   Server 配置数量:", serverConfig.mcp_servers.length);

  // 3. 找到 mcp-component-render 服务器
  const componentRenderServer = serverConfig.mcp_servers.find(
    (server) => server.server_name === "mcp-component-render",
  );

  console.log("\n3. mcp-component-render 服务器配置:");
  if (componentRenderServer) {
    console.log("   服务器名称:", componentRenderServer.server_name);
    console.log(
      "   是否启用:",
      componentRenderServer.enabled ? "✓ 启用" : "✗ 禁用",
    );
    console.log("   命令:", componentRenderServer.command);
    console.log("   参数:", componentRenderServer.args);
  } else {
    console.log("   ✗ 未找到 mcp-component-render 服务器");
  }

  // 4. 过滤出对应的组件配置
  const componentsForServer = componentConfig.filter(
    (component) => component.serverName === "mcp-component-render",
  );

  console.log("\n4. 对应的组件配置:");
  console.log("   组件数量:", componentsForServer.length);
  componentsForServer.forEach((component, index) => {
    console.log(
      `   组件 ${index + 1}: ${component.name} - ${component.description}`,
    );
  });

  // 5. 模拟环境变量设置
  const envValue = JSON.stringify(componentsForServer);
  console.log("\n5. 环境变量 MCP_COMPONENT_CONFIG:");
  console.log("   长度:", envValue.length);
  console.log("   内容 (前100字符):", envValue.substring(0, 100) + "...");

  // 6. 验证 JSON 解析
  try {
    const parsedConfig = JSON.parse(envValue);
    console.log("\n6. JSON 解析验证:");
    console.log("   ✓ 可以正确解析");
    console.log("   解析后组件数量:", parsedConfig.length);
  } catch (error) {
    console.log("\n6. JSON 解析验证:");
    console.log("   ✗ 解析失败:", error.message);
  }
} catch (error) {
  console.error("读取配置文件失败:", error.message);
}

console.log("\n=== 测试完成 ===");
