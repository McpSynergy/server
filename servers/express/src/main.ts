import express from "express";
import "dotenv/config";
import { configureApp, configureErrorHandling } from "./config/app";
import { mainRouter } from "./routes";

const app = express();
const port = process.env.PORT || 3000;

// 配置应用
configureApp(app);

// 配置路由
app.use(mainRouter);

// 配置错误处理
configureErrorHandling(app);

// 只在非生产环境下启动服务器
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// 导出 app 实例供 Vercel 使用
export default app;
