import { Router, Request, Response } from "express";
import { books } from "../book";

const router = Router();

// 获取所有书籍
router.get("/", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const response = {
    code: 0,
    data: books,
  };
  res.write(`data: ${JSON.stringify(response)}\n\n`);
  res.end();
});

// 根据 ID 获取书籍
router.get("/:bookId", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { bookId } = req.params;
  const book = books.find((book) => book.id === bookId);
  const response = {
    code: 0,
    data: book,
  };
  res.write(`data: ${JSON.stringify(response)}\n\n`);
  res.end();
});

export { router as booksRouter }; 