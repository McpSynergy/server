import cors from "cors";
import express from "express";
import { signatureMiddleware } from "../middleware/signatureMiddleware";

export function configureApp(app: express.Application) {
  // 配置 CORS
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature'],
    credentials: true,
    maxAge: 86400
  }));

  app.use(express.json());
  // @ts-ignore
  app.use(signatureMiddleware);
}

export function configureErrorHandling(app: express.Application) {
  // 错误处理中间件
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
  });

  // 404 处理
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ error: "Not Found" });
  });
} 