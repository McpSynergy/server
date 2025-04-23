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
        content:
          "压缩图片 /Users/yangjie/Desktop/iShot_2025-03-21_15.21.31.png ，压缩质量为 0.8",
      },
    ],
  }),
}).then(async (response) => {
  console.log("response", response);

  const reader = response.body.getReader();
  let fullResponse = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    fullResponse += chunk;
  }
  console.log("完整响应内容:", JSON.parse(fullResponse));
});
