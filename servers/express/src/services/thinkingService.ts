import { Response } from "express";
import { MCPService } from "./mcpService";
import { AIService } from "./aiService";
import { ThinkingRequest, SSEStepData, ToolMeta, UnifiedResponseData } from "../types";
import { parseToolResult, parseStatusInfo } from "../utils";

export class ThinkingService {
  static async processThinking(thinkingData: ThinkingRequest) {
    const {
      thought,
      thoughtNumber = 1,
      totalThoughts = 1,
      nextThoughtNeeded = false,
      isRevision = false,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts = false
    } = thinkingData;

    const toolResult = await MCPService.callTool(
      "sequential-thinking",
      "sequentialthinking",
      {
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        isRevision,
        revisesThought,
        branchFromThought,
        branchId,
        needsMoreThoughts
      }
    );

    const apiOutput = parseToolResult(toolResult);

    return {
      thought,
      thoughtNumber,
      totalThoughts,
      nextThoughtNeeded,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts,
      result: apiOutput?.type === "text" ? apiOutput?.content || "" : "",
      rawResult: toolResult
    };
  }

  static async processThinkingUnified(thinkingData: ThinkingRequest): Promise<UnifiedResponseData> {
    const {
      thought,
      thoughtNumber = 1,
      totalThoughts = 1,
      nextThoughtNeeded = false,
      isRevision = false,
      revisesThought,
      branchFromThought,
      branchId,
      needsMoreThoughts = false
    } = thinkingData;

    const toolResult = await MCPService.callTool(
      "sequential-thinking",
      "sequentialthinking",
      {
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        isRevision,
        revisesThought,
        branchFromThought,
        branchId,
        needsMoreThoughts
      }
    );

    const apiOutput = parseToolResult(toolResult);

    // 解析状态信息
    let statusInfo: any = {};
    if (apiOutput?.type === "text" && apiOutput.content) {
      statusInfo = parseStatusInfo(apiOutput.content);
    }

    // 构建响应内容
    let responseMessage = `🧠 **Sequential Thinking - 步骤 ${thoughtNumber}/${totalThoughts}**\n\n`;
    responseMessage += `**思考内容：**\n${thought}\n\n`;

    // 显示状态信息
    if (statusInfo && Object.keys(statusInfo).length > 0) {
      responseMessage += `📊 **状态信息：**\n`;
      responseMessage += `- 当前步骤：${statusInfo.thoughtNumber || thoughtNumber}/${statusInfo.totalThoughts || totalThoughts}\n`;
      responseMessage += `- 思考历史长度：${statusInfo.thoughtHistoryLength || 1}\n`;
      responseMessage += `- 分支数量：${statusInfo.branches?.length || 0}\n\n`;
    }

    responseMessage += `✅ **状态：** 思考完成`;

    const meta: ToolMeta = {
      serverName: "sequential-thinking",
      toolName: "sequentialthinking",
      componentProps: toolResult?._meta?.props,
      aiOutput: apiOutput?.type === "text" ? apiOutput?.content || "" : "",
      thinkingProcess: {
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        statusInfo,
        isRevision,
        revisesThought,
        branchFromThought,
        branchId
      }
    };

    return {
      content: responseMessage,
      meta: meta
    };
  }

  static async handleSequentialThinking(
    toolArgs: any,
    toolResult: any,
    res: Response
  ): Promise<UnifiedResponseData | void> {
    const parsedArgs = JSON.parse(toolArgs);
    const {
      thought,
      thoughtNumber = 1,
      totalThoughts = 5,
      nextThoughtNeeded
    } = parsedArgs;

    const apiOutput = parseToolResult(toolResult);

    console.log(`🔍 Sequential-thinking 调用 - 步骤: ${thoughtNumber}/${totalThoughts}`);
    console.log(`🔍 思考内容 (原始): ${thought}`);
    console.log(`🔍 思考内容长度: ${thought.length} 字符`);
    console.log(`🔍 是否包含中文: ${/[\u4e00-\u9fa5]/.test(thought)}`);
    console.log(`🔍 工具结果:`, JSON.stringify(toolResult, null, 2));

    // 解析状态信息
    let statusInfo: any = {};
    if (apiOutput?.type === "text" && apiOutput.content) {
      statusInfo = parseStatusInfo(apiOutput.content);
      console.log(`🔍 状态信息:`, JSON.stringify(statusInfo, null, 2));
    }

    const meta: ToolMeta = {
      serverName: "sequential-thinking",
      toolName: "sequentialthinking",
      componentProps: toolResult?._meta?.props,
      aiOutput: apiOutput?.type === "text" ? apiOutput?.content || "" : "",
      thinkingProcess: {
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        statusInfo,
        isRevision: parsedArgs.isRevision || false,
        revisesThought: parsedArgs.revisesThought,
        branchFromThought: parsedArgs.branchFromThought,
        branchId: parsedArgs.branchId
      }
    };

    // 如果需要继续思考，使用流式输出逐步显示
    if (nextThoughtNeeded && thoughtNumber < totalThoughts) {
      await this.streamThinkingProcess(res, thought, thoughtNumber, totalThoughts, statusInfo);
      return;
    } else {
      // 单步显示
      let responseMessage = `🧠 **Sequential Thinking - 步骤 ${thoughtNumber}/${totalThoughts}**\n\n`;
      responseMessage += `**思考内容：**\n${thought}\n\n`;

      // 显示状态信息
      if (statusInfo && Object.keys(statusInfo).length > 0) {
        responseMessage += `📊 **状态信息：**\n`;
        responseMessage += `- 当前步骤：${statusInfo.thoughtNumber || thoughtNumber}/${statusInfo.totalThoughts || totalThoughts}\n`;
        responseMessage += `- 思考历史长度：${statusInfo.thoughtHistoryLength || 1}\n`;
        responseMessage += `- 分支数量：${statusInfo.branches?.length || 0}\n\n`;
      }

      responseMessage += `✅ **状态：** 思考完成`;

      return { content: responseMessage, meta };
    }
  }

  private static async streamThinkingProcess(
    res: Response,
    firstThought: string,
    startStep: number,
    totalSteps: number,
    initialStatusInfo: any
  ) {
    console.log(`🔄 开始流式输出完整思考过程，忽略用户原始输入，从AI生成内容开始`);

    // 清理之前的思考历史，并将第一步的用户原始输入添加到历史中（仅用于上下文，不输出）
    AIService.clearThinkingHistory();
    AIService.initializeThinkingHistory(firstThought, totalSteps);

    // 注意：SSE 响应头应该在路由层面设置，这里不再重复设置

    // 跳过用户原始输入，直接从AI生成的第一步开始
    let currentStep = 0; // 从0开始，第一次循环会变成1
    let continueThinking = true;
    let actualStepNumber = 1; // 实际显示的步骤编号

    // 继续执行所有步骤，实时流式输出（跳过用户原始输入）
    while (continueThinking && actualStepNumber <= totalSteps) {
      try {
        currentStep++;
        console.log(`🔄 让AI生成第 ${actualStepNumber} 步思考内容（内部步骤${currentStep + 1}）...`);

        // 发送进度更新
        const progressData: SSEStepData = {
          type: 'progress',
          step: actualStepNumber,
          totalSteps: totalSteps,
          message: `正在生成第 ${actualStepNumber} 步思考内容...`
        };
        const progressResponse = {
          code: 0,
          data: progressData
        };
        res.write(`data: ${JSON.stringify(progressResponse)}\n\n`);

        // 调用AI生成思考内容，从第2步开始（跳过用户输入的第1步）
        const nextThoughtContent = await AIService.generateNextThought(currentStep + 1, undefined, totalSteps);

        // 调用sequential-thinking工具记录这一步
        const stepResult = await MCPService.callTool(
          "sequential-thinking",
          "sequentialthinking",
          {
            thought: nextThoughtContent,
            thoughtNumber: actualStepNumber,
            totalThoughts: totalSteps,
            nextThoughtNeeded: actualStepNumber < totalSteps
          }
        );

        const stepContent = parseToolResult(stepResult);
        const stepOutput = stepContent?.type === "text" ? stepContent.content : "";

        let stepStatusInfo: any = {};
        if (stepOutput) {
          stepStatusInfo = parseStatusInfo(stepOutput);
          // 更新状态信息中的步骤编号
          stepStatusInfo.thoughtNumber = actualStepNumber;
          stepStatusInfo.totalThoughts = totalSteps;
          stepStatusInfo.nextThoughtNeeded = actualStepNumber < totalSteps;

          continueThinking = stepStatusInfo.nextThoughtNeeded && actualStepNumber < totalSteps;
          console.log(`✅ 第 ${actualStepNumber} 步完成：${nextThoughtContent.substring(0, 50)}...`);
        } else {
          console.log(`❌ 第 ${actualStepNumber} 步没有返回状态`);
          continueThinking = actualStepNumber < totalSteps;
          // 创建默认状态信息
          stepStatusInfo = {
            thoughtNumber: actualStepNumber,
            totalThoughts: totalSteps,
            nextThoughtNeeded: actualStepNumber < totalSteps,
            branches: [],
            thoughtHistoryLength: currentStep + 1
          };
        }

        // 立即发送这一步的结果
        const stepData: SSEStepData = {
          type: 'step',
          step: actualStepNumber,
          totalSteps: totalSteps,
          content: nextThoughtContent,
          statusInfo: stepStatusInfo,
          completed: false
        };

        const stepResponse = {
          code: 0,
          data: stepData
        };
        res.write(`data: ${JSON.stringify(stepResponse)}\n\n`);
        console.log(`📡 已发送第 ${actualStepNumber} 步`);

        actualStepNumber++;

        // 防止无限循环
        if (actualStepNumber > totalSteps) {
          continueThinking = false;
        }
      } catch (error) {
        console.error(`执行第 ${actualStepNumber} 步失败:`, error);

        // 发送错误信息
        const errorData: SSEStepData = {
          type: 'error',
          step: actualStepNumber,
          totalSteps: totalSteps,
          message: `第${actualStepNumber}步思考执行失败: ${error instanceof Error ? error.message : String(error)}`
        };
        const errorResponse = {
          code: 500,
          data: errorData
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        break;
      }
    }

    // 发送完成信息
    const completeData: SSEStepData = {
      type: 'complete',
      totalSteps: totalSteps,
      message: actualStepNumber > totalSteps ?
        `✅ 思考完成！已完成所有 ${totalSteps} 个步骤的深度分析` :
        `⚠️ 思考中断，完成了 ${actualStepNumber - 1}/${totalSteps} 步`,
      completed: true
    };

    const completeResponse = {
      code: 0,
      data: completeData
    };
    res.write(`data: ${JSON.stringify(completeResponse)}\n\n`);
    console.log(`📡 已发送完成信息`);

    // 清理思考历史，为下次使用做准备
    AIService.clearThinkingHistory();

    res.end();
  }
} 