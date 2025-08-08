module.exports = {
  apps: [
    {
      name: "mcp-component-render-server",
      script: "./dist/main.js",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 33402,
        // MODEL: "deepseek-ai/DeepSeek-V3-0324",
        MODEL: "Qwen/Qwen3-8B",
        MESSAGE_SUFFIX: "/no_think",
      },
      env_production: {
        NODE_ENV: "production",
      },
      watch: false,
      instances: "1",
      exec_mode: "fork",
    },
  ],
};
