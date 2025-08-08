import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "bc926e1d-486d-42af-aff2-731fcfa2887e",
  baseURL: "http://code.ugreencloud.com:8000/v1",
});

async function main() {
  const response = await openai.chat.completions.create({
    model: "deepseek-ai/DeepSeek-V3-0324",
    messages: [{ role: "user", content: "Hello, how are you?" }],
  });
  console.log(response);
}

main();
