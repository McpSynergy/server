import OpenAI from "openai";
import "dotenv/config";

// import { Ollama } from 'ollama'


export const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});


