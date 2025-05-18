// 调用工具
const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const testAPI = async () => {
  try {
    const response = await fetch(
      "https://server-pip7cy0r1-nelsonyongs-projects.vercel.app//message",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature":
            "f3de0210ee9003d84626476c631ffc0d1ddf0c268696d7d3e2caa5a3b71273b6",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "1+1=?",
            },
          ],
        }),
      },
    );

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    const reader = response.body.getReader();
    let fullResponse = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = new TextDecoder().decode(value);
      fullResponse += chunk;
    }
    console.log("完整响应内容:", JSON.parse(fullResponse));
  } catch (error) {
    console.error("请求失败:", error);
    if (error.name === "AbortError") {
      console.error("请求超时");
    } else if (error.code === "UND_ERR_CONNECT_TIMEOUT") {
      console.error("连接超时");
    } else {
      console.error("其他错误:", error.message);
    }
  }
};

testAPI();
