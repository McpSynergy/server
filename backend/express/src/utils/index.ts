export const formatJson = (str: string) => {
  const json = `\`\`\`json
${str}
\`\`\``;
  return json;
};

export const parseToolResult = (toolResult: any) => {
  const toolContent = (toolResult?.content as any)?.[0];
  return toolContent?.type === "text" ? { type: "text", content: toolContent.text } : undefined;
};

export const parseStatusInfo = (output: string) => {
  try {
    return JSON.parse(output);
  } catch (e) {
    console.log(`⚠️ 无法解析状态信息:`, output);
    return {};
  }
}; 