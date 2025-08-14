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

  // static async createOllamaChatCompletion(messages: any[], tools?: any[]) {
  //   return await ollama.chat({
  //     messages: messages || [
  //       { role: "system", content: "You are a helpful assistant." },
  //     ],
  //     model: "deepseek-r1:7b",
  //     tools: tools,
  //     think: false
  //   });
  // }

  // 存储思考历史的静态变量
  private static thinkingHistory: string[] = [];
  private static currentTopic: string = "";

  static async generateNextThought(stepNumber: number, initialThought?: string, _totalSteps?: number, searchResults?: string) {
    // 只有在非流式处理时才初始化历史（即直接调用且传入了initialThought）
    if (stepNumber === 1 && initialThought && this.thinkingHistory.length === 0) {
      this.thinkingHistory = [initialThought];
      this.currentTopic = this.extractTopicFromThought(initialThought);
    }

    // 构建上下文信息
    const contextInfo = this.thinkingHistory.length > 0
      ? `## 前面的思考历程\n${this.thinkingHistory.map((thought, index) => `### 第${index + 1}步思考\n${thought}`).join('\n\n')}\n\n`
      : '';

    // 根据步骤生成不同的思考方向
    const thinkingDirections = this.getThinkingDirection(stepNumber, _totalSteps || 5);
    const markdownStructure = this.getMarkdownStructure(stepNumber);

    const contextAnalysis = this.thinkingHistory.length > 1
      ? `\n## 基于前面思考的延伸分析\n${this.generateContinuityHints(stepNumber)}\n`
      : '';

    // 构建搜索结果上下文（如果有）
    const searchContext = searchResults
      ? `\n（如果有搜索结果，则输出相关参考信息）## 相关参考信息\n${searchResults}\n\n**引用要求**：在回答中适当引用相关信息时，使用[ref:X]格式标注参考来源编号。\n`
      : '';

    const nextThinkingPrompt = `# 结构化思考任务

## 思考主题
**当前主题**：${this.currentTopic}

${contextInfo}${contextAnalysis}${searchContext}

## 第${stepNumber}步思考要求

### 思考方向
${thinkingDirections}

### 输出结构模板
\`\`\`markdown
${markdownStructure}
\`\`\`

## 质量标准

### 核心要求
1. **信息甄别**：对相关信息进行筛选和甄别，选择最相关的内容
2. **结构清晰**：严格按照提供的 Markdown 结构模板输出
3. **逻辑连贯**：在前面思考基础上深化，避免重复分析
4. **内容充实**：提供具体、可操作的见解，避免空泛表述
5. **要点精炼**：控制在5个核心要点以内，合并相关内容

### 格式要求
- 使用恰当的标题层级和列表格式
- 重要概念加粗显示
- 适当使用 emoji 提升可读性
- 确保段落结构合理，便于阅读

### 深度要求
- 提供多角度的分析视角
- 包含具体实例或应用场景
- 体现思想深度和专业性
- 确保信息量充足、论述详尽

**开始第${stepNumber}步结构化思考：**`;

    const aiResponse = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `你是一个善于思考的日常助手，能把复杂的事情用简单清楚的方式分析出来。

## 你的特点
- **简单直接**：用大家都能懂的话来解释事情
- **一步步来**：基于前面想到的内容，每次都往前推进一点  
- **条理清楚**：按照给定的格式来整理想法
- **实用为主**：重点说有用的、能操作的内容

## 回答方式
### 内容要求
- 每次最多说3-5个要点，不要太多
- 用具体例子来说明，不要说空话
- 如果有参考资料，用[ref:X]标出来源

### 表达方式  
- 用日常语言，不要太正式
- 重要的地方用**粗体**标出
- 适当用emoji让内容更生动
- 分段清楚，便于阅读

### 思考逻辑
- 每一步都要在前面基础上继续深入
- 避免重复说已经分析过的内容  
- 多想想实际应用和具体做法
- 保持简单易懂，但内容要有用`
        },
        { role: "user", content: nextThinkingPrompt }
      ],
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo", // 使用统一的模型配置
      max_tokens: 400,
      temperature: 0.6
    });

    const newThoughtContent = aiResponse.choices[0].message.content || `第${stepNumber}步思考内容`;

    // 清理 DeepSeek 工具调用标记
    const cleanedContent = newThoughtContent.replace(/<｜tool▁call▁end｜>|<｜tool▁calls▁end｜>/g, '').trim();

    // 将新的思考内容添加到历史中
    this.thinkingHistory.push(cleanedContent);

    return cleanedContent;
  }

  // 从初始思考中提取主题
  private static extractTopicFromThought(thought: string): string {
    // 从思考内容中提取关键词作为主题
    const words = thought.split(/[，。！？\s]+/).filter(word => word.length > 1);
    return words.slice(0, 3).join('') || '深度思考';
  }

  // 根据步骤获取思考方向
  private static getThinkingDirection(stepNumber: number, _totalSteps: number): string {
    // 现在stepNumber从2开始，但我们要调整逻辑让它看起来从1开始
    const adjustedStepNumber = stepNumber - 1;

    if (adjustedStepNumber === 1 || stepNumber === 2) {
      return "先把基本的情况弄清楚";
    }

    // 分析当前主题和思考历史，动态确定思考方向
    const topicContext = this.currentTopic + " " + this.thinkingHistory.join(" ");

    // 检查是否需要机制分析
    if (this.shouldIncludeMechanism(topicContext)) {
      return "想想这个是怎么运作的，背后的道理是什么";
    }

    // 检查是否需要实践技巧
    if (this.shouldIncludePractice(topicContext)) {
      return "说说具体怎么做，有什么技巧和窍门";
    }

    // 检查是否需要进阶应用
    if (this.shouldIncludeAdvanced(topicContext)) {
      return "看看还有什么更好的做法，或者其他用途";
    }

    // 检查是否需要总结
    if (this.shouldIncludeSummary(adjustedStepNumber)) {
      return "把前面想到的内容整理一下，总结要点";
    }

    // 默认简单思考方向
    const simpleDirections = [
      "换个角度再想想",
      "看看有什么要注意的地方",
      "想想实际用起来怎么样",
      "考虑一下可能遇到的问题"
    ];

    return simpleDirections[(adjustedStepNumber - 2) % simpleDirections.length];
  }

  // 根据步骤获取 Markdown 结构模板
  private static getMarkdownStructure(stepNumber: number): string {
    // 分析当前主题和思考历史，判断需要哪些部分
    const topicContext = this.currentTopic + " " + this.thinkingHistory.join(" ");

    // 现在stepNumber从2开始，但我们要调整逻辑让它看起来从1开始
    const adjustedStepNumber = stepNumber - 1;
    const displayStepNumber = adjustedStepNumber; // 显示时的步骤编号

    if (adjustedStepNumber === 1 || stepNumber === 2) {
      return `## 第${displayStepNumber}步：基本情况

### 🔍 主要方面  
1. **方面一**：具体说明为什么重要
2. **方面二**：具体说明为什么重要
3. **方面三**：具体说明为什么重要

### 💭 我的理解
- **观察点一**：具体描述和简单分析
- **观察点二**：具体描述和简单分析
- **观察点三**：具体描述和简单分析

### 🎯 初步想法
简单总结一下现在的理解和感觉...（举个具体例子）`;
    }

    // 动态生成后续步骤的模板
    let template = `## 第${displayStepNumber}步：`;
    let sections: string[] = [];

    // 检查是否需要机制分析
    if (this.shouldIncludeMechanism(topicContext)) {
      template += "弄清楚运作原理";
      sections.push(`### 🤔 这是怎么回事
1. **原理一**：简单说说是怎么运作的
2. **原理二**：简单说说是怎么运作的
3. **原理三**：简单说说是怎么运作的

### 💡 为什么会这样
- **原因一**：具体解释为什么
- **原因二**：具体解释为什么
- **原因三**：具体解释为什么

### 🌟 实际例子
举几个身边的例子来说明...（用大家熟悉的事情来比较）`);
    }

    // 检查是否需要实践技巧
    else if (this.shouldIncludePractice(topicContext)) {
      template += "具体怎么做";
      sections.push(`### 🔨 实用技巧
1. **技巧一**：怎么做 → 要注意什么 → 效果如何
2. **技巧二**：怎么做 → 要注意什么 → 效果如何
3. **技巧三**：怎么做 → 要注意什么 → 效果如何

### ✅ 好的做法
- **做法一**：具体怎么操作，关键在哪里
- **做法二**：具体怎么操作，关键在哪里
- **做法三**：具体怎么操作，关键在哪里

### ⚠️ 要避免的坑
说说容易出错的地方和怎么避免...（提醒一些常见错误）`);
    }

    // 检查是否需要进阶应用
    else if (this.shouldIncludeAdvanced(topicContext)) {
      template += "更多用法和想法";
      sections.push(`### 🌟 其他用法
1. **用法一**：在什么情况下用，怎么用
2. **用法二**：在什么情况下用，怎么用
3. **用法三**：在什么情况下用，怎么用

### 💡 创新想法
- **想法一**：有什么新的尝试，好处是什么
- **想法二**：有什么新的尝试，好处是什么
- **想法三**：有什么新的尝试，好处是什么

### 🎉 可以试试
给出一些实际可以尝试的建议...（提供简单易行的改进方法）`);
    }

    // 检查是否需要总结整合
    else if (this.shouldIncludeSummary(adjustedStepNumber)) {
      template += "总结一下";
      sections.push(`### 📝 重点回顾
1. **要点一**：主要内容，为什么重要
2. **要点二**：主要内容，为什么重要
3. **要点三**：主要内容，为什么重要

### 🗂️ 整体思路
- **思路一**：整体来看是什么样的
- **思路二**：整体来看是什么样的
- **思路三**：整体来看是什么样的

### 🎯 我的建议
综合前面所有想法，给出实用的建议...（提供简单明确的行动建议）`);
    }

    // 默认简单思考
    else {
      template += "再想想";
      sections.push(`### 🤔 我觉得
1. **想法一**：具体想法和简单理由
2. **想法二**：具体想法和简单理由
3. **想法三**：具体想法和简单理由

### 👀 不同角度看
- **角度一**：从这个角度看是什么样
- **角度二**：从这个角度看是什么样
- **角度三**：从这个角度看是什么样

### 💭 新想法
有什么不一样的想法或者新的理解...（说说有意思的发现）`);
    }

    return template + "\n\n" + sections.join("\n\n");
  }

  // 检查是否需要包含机制分析
  private static shouldIncludeMechanism(context: string): boolean {
    const mechanismKeywords = ["机制", "原理", "为什么", "如何", "工作", "运行", "过程", "步骤"];
    return mechanismKeywords.some(keyword => context.includes(keyword));
  }

  // 检查是否需要包含实践技巧
  private static shouldIncludePractice(context: string): boolean {
    const practiceKeywords = ["技巧", "方法", "怎么做", "操作", "实践", "技术", "窍门", "经验"];
    return practiceKeywords.some(keyword => context.includes(keyword));
  }

  // 检查是否需要包含进阶应用
  private static shouldIncludeAdvanced(context: string): boolean {
    const advancedKeywords = ["应用", "扩展", "变式", "创新", "高级", "进阶", "优化", "改进"];
    return advancedKeywords.some(keyword => context.includes(keyword));
  }

  // 检查是否需要包含总结（通常在最后几步）
  private static shouldIncludeSummary(stepNumber: number): boolean {
    return stepNumber >= 4 || stepNumber === this.thinkingHistory.length;
  }

  // 生成基于前面思考的连续性分析
  private static generateContinuityHints(stepNumber: number): string {
    // 现在stepNumber从2开始，但要调整逻辑让它看起来从1开始
    const adjustedStepNumber = stepNumber - 1;

    if (this.thinkingHistory.length < 2) {
      return `### 开始思考
这是第一步，先把基本情况弄清楚，为后面的思考做准备。

### 重点关注
- 把主要的方面都想到
- 理清楚基本的思路
- 为后面深入思考打好基础`;
    }

    const previousThought = this.thinkingHistory[this.thinkingHistory.length - 1];
    const analysisPoints = [];
    const deepeningDirections = [];

    // 基于前一步思考内容的延伸
    if (previousThought.includes('基础') || previousThought.includes('要素') || previousThought.includes('框架') || previousThought.includes('方面') || previousThought.includes('基本')) {
      analysisPoints.push("**接着前面的想法**：把前面提到的重点再深入想想，看看它们之间有什么联系");
      deepeningDirections.push("从单个方面转向整体考虑");
      deepeningDirections.push("想想哪些更重要，哪些是次要的");
    }

    if (previousThought.includes('机制') || previousThought.includes('原理') || previousThought.includes('逻辑') || previousThought.includes('回事') || previousThought.includes('为什么')) {
      analysisPoints.push("**从道理到实际**：既然明白了是怎么回事，现在想想实际怎么用");
      deepeningDirections.push("从理解原理转向实际操作");
      deepeningDirections.push("考虑什么情况下管用，什么情况下不行");
    }

    if (previousThought.includes('技巧') || previousThought.includes('方法') || previousThought.includes('实践') || previousThought.includes('做法') || previousThought.includes('怎么做')) {
      analysisPoints.push("**从基本到进阶**：基本做法已经清楚了，看看还有什么更好的方法");
      deepeningDirections.push("从基础做法扩展到巧妙技巧");
      deepeningDirections.push("想想在不同情况下怎么调整方法");
    }

    if (previousThought.includes('应用') || previousThought.includes('场景') || previousThought.includes('创新') || previousThought.includes('用法') || previousThought.includes('想法')) {
      analysisPoints.push("**总结整理**：前面想了很多，现在把有用的内容整理一下");
      deepeningDirections.push("从各种想法整理出主要观点");
      deepeningDirections.push("总结出实用的建议和方法");
    }

    // 根据调整后的步骤数添加特定的思考方向
    const stepGuidance = this.getStepSpecificGuidance(adjustedStepNumber);

    const result = `### 接下来要想的
${analysisPoints.length > 0 ? analysisPoints.join('\n- ') : '基于前面的想法继续深入'}

### 思考方向
${deepeningDirections.length > 0 ? deepeningDirections.map(d => `- ${d}`).join('\n') : '- 在前面基础上再想深一点'}

### 这一步的重点
${stepGuidance}

### 注意事项
- 要跟前面的想法有联系，不要重复说过的内容
- 每个想法都要说清楚，举具体例子
- 不要说太多，3-5个要点就够了，重点是想得透彻`;

    return result;
  }

  // 获取特定步骤的指导方向
  private static getStepSpecificGuidance(stepNumber: number): string {
    switch (stepNumber) {
      case 2:
        return "**从'是什么'到'为什么'**：第一步了解了基本情况，现在想想背后的原因";
      case 3:
        return "**从'为什么'到'怎么办'**：明白了原因，现在想想具体该怎么做";
      case 4:
        return "**从基本做法到更好做法**：基本方法有了，看看有没有更巧妙的方式";
      case 5:
        return "**把想法整理一下**：前面想了很多，现在梳理出最有用的部分";
      default:
        return "**继续深入想想**：在现有想法基础上再挖掘一些有价值的内容";
    }
  }

  // 初始化思考历史（不调用AI，直接使用用户输入）
  static initializeThinkingHistory(firstThought: string, _totalSteps: number) {
    this.thinkingHistory = [firstThought];
    this.currentTopic = this.extractTopicFromThought(firstThought);
    console.log(`🔍 初始化思考历史 - 主题: ${this.currentTopic}, 第一步内容: ${firstThought.substring(0, 50)}...`);
  }

  // 清理思考历史（可选，用于重置）
  static clearThinkingHistory() {
    this.thinkingHistory = [];
    this.currentTopic = "";
  }
} 