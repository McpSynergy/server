import { openai } from "../config/openai";

console.log("[Model]", process.env.OPENAI_MODEL);

export class AIService {
  static async createChatCompletion(messages: any[], tools?: any[]) {
    return await openai.chat.completions.create({
      messages: messages || [
        { role: "system", content: "You are a helpful assistant." },
      ],
      // model: "Qwen/Qwen3-8B",
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      tools: tools,
      stream: true
    });
  }

  static async createChatCompletionOnce(messages: any[], tools?: any[]) {
    return await openai.chat.completions.create({
      messages: messages || [
        { role: "system", content: "You are a helpful assistant." },
      ],
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      tools: tools,
      stream: false
    });
  }

} 