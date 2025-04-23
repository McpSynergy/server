// 调用工具
fetch("http://localhost:3000/message", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "x-signature":
      "f3de0210ee9003d84626476c631ffc0d1ddf0c268696d7d3e2caa5a3b71273b6",
  },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "Hello, how are you?",
      },
    ],
  }),
}).then(async (response) => {
  const reader = response.body.getReader();
  let fullResponse = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    fullResponse += chunk;
  }
  const contentArray = fullResponse
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => {
      try {
        return JSON.parse(line.replace("data: ", "")).content;
      } catch (e) {
        return "";
      }
    });
  const combinedContent = contentArray.join("");
  console.log("完整响应内容:", combinedContent);
});
