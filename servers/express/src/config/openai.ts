import OpenAI from "openai";
import "dotenv/config";

export const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
}); 