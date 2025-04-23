import express from 'express';
import { Signature } from './signature';
import { signatureMiddleware } from './middleware/signatureMiddleware';

import OpenAI from "openai";

import 'dotenv/config'


const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const data = {
  "nonce": "a3fB9zLpQ2RgT8yX",
  "payload": {
    "user_id": "USER_6192_XYZ",
  }
}
const signature = Signature.generateSignature(JSON.stringify(data), process.env.SECRET);

console.log("signature", signature);

const app = express();
const port = 3000;

app.use(express.json());
app.use(signatureMiddleware);

app.get('/', (req, res) => {
  // 从 req 中获取 signature
  res.send('Hello World!');
});

app.post('/message', async (req, res) => {
  try {
    const { messages } = req.body;
    const stream = await openai.chat.completions.create({
      messages: messages || [{ role: "system", content: "You are a helpful assistant." }],
      model: "deepseek-chat",
      stream: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});