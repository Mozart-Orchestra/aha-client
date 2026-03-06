/**
 * Team Command Parser
 * 解析和处理团队聊天中的命令
 * 支持从聊天创建和管理任务
 */

import { linkTaskToSession } from '@/-zen/model/taskSessionLink';
import { TokenStorage } from '@/auth/tokenStorage';
import { refineTeamTask, rewriteTeamTask } from '@/sync/apiTasks';
import { getServerUrl } from '@/sync/serverConfig';
import { storage } from '@/sync/storage';

export interface ParsedCommand {
  type: 'createTask' | 'updateTask' | 'assignTask' | 'completeTask' | 'refineTask' | 'rewriteTask' | 'unknown';
  params: Record<string, any>;
  rawText: string;
}

export interface TaskCommandResult {
  success: boolean;
  message: string;
  taskId?: string;
  data?: any;
}

/**
 * 解析用户输入的命令
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();

  // 任务创建命令
  // /create task Implement i18n priority:high
  const createTaskRegex = /^\/create\s+task\s+(.+)/i;
  const createMatch = trimmed.match(createTaskRegex);
  if (createMatch) {
    const params = parseTaskParams(createMatch[1]);
    return {
      type: 'createTask',
      params,
      rawText: trimmed
    };
  }

  // 任务更新命令
  // /update task <taskId> status:in-progress
  const updateTaskRegex = /^\/update\s+task\s+(.+)/i;
  const updateMatch = trimmed.match(updateTaskRegex);
  if (updateMatch) {
    return {
      type: 'updateTask',
      params: parseUpdateParams(updateMatch[1]),
      rawText: trimmed
    };
  }

  // 任务分配命令
  // /assign task <taskId> to @member
  const assignTaskRegex = /^\/assign\s+task\s+(.+)/i;
  const assignMatch = trimmed.match(assignTaskRegex);
  if (assignMatch) {
    return {
      type: 'assignTask',
      params: parseAssignParams(assignMatch[1]),
      rawText: trimmed
    };
  }

  // 任务完成命令
  // /complete task <taskId>
  const completeTaskRegex = /^\/complete\s+task\s+(\S+)/i;
  const completeMatch = trimmed.match(completeTaskRegex);
  if (completeMatch) {
    return {
      type: 'completeTask',
      params: { taskId: completeMatch[1] },
      rawText: trimmed
    };
  }

  // 任务细化命令 (AI refine)
  // /task refine <taskId> [context...]
  const refineTaskRegex = /^\/task\s+refine\s+(\S+)(?:\s+(.+))?/i;
  const refineMatch = trimmed.match(refineTaskRegex);
  if (refineMatch) {
    return {
      type: 'refineTask',
      params: {
        taskId: refineMatch[1],
        context: refineMatch[2] || undefined
      },
      rawText: trimmed
    };
  }

  // 任务重写命令 (AI rewrite)
  // /task rewrite <taskId> [style:concise|detailed|technical|user-friendly]
  const rewriteTaskRegex = /^\/task\s+rewrite\s+(\S+)(?:\s+style:(concise|detailed|technical|user-friendly))?/i;
  const rewriteMatch = trimmed.match(rewriteTaskRegex);
  if (rewriteMatch) {
    return {
      type: 'rewriteTask',
      params: {
        taskId: rewriteMatch[1],
        style: rewriteMatch[2] || 'concise'
      },
      rawText: trimmed
    };
  }

  return null;
}

/**
 * 解析任务参数
 * 输入: "Implement i18n priority:high assignee:@builder"
 */
function parseTaskParams(input: string): Record<string, any> {
  const params: Record<string, any> = {
    title: '',
    description: '',
    priority: 'medium',
    assignee: null
  };

  // 提取 priority
  const priorityRegex = /priority:\s*(low|medium|high|urgent)/i;
  const priorityMatch = input.match(priorityRegex);
  if (priorityMatch) {
    params.priority = priorityMatch[1].toLowerCase();
    input = input.replace(priorityRegex, '').trim();
  }

  // 提取 assignee
  const assigneeRegex = /assignee:\s*@(\w+)/i;
  const assigneeMatch = input.match(assigneeRegex);
  if (assigneeMatch) {
    params.assignee = assigneeMatch[1];
    input = input.replace(assigneeRegex, '').trim();
  }

  // 剩余部分作为标题
  params.title = input;

  return params;
}

/**
 * 解析更新参数
 * 输入: "<taskId> status:in-progress priority:high"
 */
function parseUpdateParams(input: string): Record<string, any> {
  const params: Record<string, any> = {};

  // 第一个词是taskId
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts[0]) {
    params.taskId = parts[0];
  }

  // 提取status
  const statusRegex = /status:\s*(todo|in-progress|review|done)/i;
  const statusMatch = input.match(statusRegex);
  if (statusMatch) {
    params.status = statusMatch[1];
  }

  // 提取priority
  const priorityRegex = /priority:\s*(low|medium|high|urgent)/i;
  const priorityMatch = input.match(priorityRegex);
  if (priorityMatch) {
    params.priority = priorityMatch[1].toLowerCase();
  }

  return params;
}

/**
 * 解析分配参数
 * 输入: "<taskId> to @member"
 */
function parseAssignParams(input: string): Record<string, any> {
  const params: Record<string, any> = {};

  const parts = input.trim().split(/\s+/);
  if (parts.length >= 2) {
    params.taskId = parts[0];
    // 提取@mentions
    const mentionRegex = /@(\w+)/;
    const mentionMatch = input.match(mentionRegex);
    if (mentionMatch) {
      params.assignee = mentionMatch[1];
    }
  }

  return params;
}

/**
 * 执行任务创建命令
 */
export async function executeCreateTask(
  params: Record<string, any>,
  sessionId: string,
  teamId: string,
  displayName: string
): Promise<TaskCommandResult> {
  try {
    // 生成新的taskId
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建新任务
    const newTask = {
      id: taskId,
      title: params.title || 'Untitled Task',
      description: params.description || '',
      done: false,
      status: 'todo',
      priority: params.priority || 'medium',
      assignee: params.assignee || null,
      teamId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      linkedSessions: {}
    };

    // 添加到storage
    const currentState = storage.getState();
    const todoState = currentState.todoState || { todos: {}, undoneOrder: [], doneOrder: [], versions: {} };
    const updatedTodoState = {
      ...todoState,
      todos: { ...todoState.todos, [taskId]: newTask },
      undoneOrder: todoState.undoneOrder?.includes(taskId)
        ? todoState.undoneOrder
        : [taskId, ...(todoState.undoneOrder || [])],
    };

    storage.getState().applyTodos(updatedTodoState);

    // 关联当前session
    await linkTaskToSession(
      taskId,
      sessionId,
      newTask.title,
      displayName
    );

    return {
      success: true,
      message: `✅ Task created: "${newTask.title}"\nPriority: ${newTask.priority}${params.assignee ? `\nAssigned to: @${params.assignee}` : ''}`,
      taskId,
      data: newTask
    };
  } catch (error) {
    console.error('Failed to create task:', error);
    return {
      success: false,
      message: `❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 执行任务更新命令
 */
export async function executeUpdateTask(
  params: Record<string, any>
): Promise<TaskCommandResult> {
  try {
    const currentState = storage.getState();
    const todo = currentState.todoState?.todos[params.taskId];

    if (!todo) {
      return {
        success: false,
        message: `❌ Task not found: ${params.taskId}`
      };
    }

    // 更新任务
    const updatedTask = {
      ...todo,
      ...(params.status && { status: params.status }),
      ...(params.priority && { priority: params.priority }),
      updatedAt: Date.now()
    };

    // 保存更新
    // TODO: 调用实际的storage更新函数

    return {
      success: true,
      message: `✅ Task updated: "${updatedTask.title}"\n${params.status ? `Status: ${params.status}` : ''}${params.priority ? `Priority: ${params.priority}` : ''}`,
      taskId: params.taskId,
      data: updatedTask
    };
  } catch (error) {
    console.error('Failed to update task:', error);
    return {
      success: false,
      message: `❌ Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 执行任务完成命令
 */
export async function executeCompleteTask(
  taskId: string
): Promise<TaskCommandResult> {
  try {
    const currentState = storage.getState();
    const todo = currentState.todoState?.todos[taskId];

    if (!todo) {
      return {
        success: false,
        message: `❌ Task not found: ${taskId}`
      };
    }

    // 更新为完成状态
    const updatedTask = {
      ...todo,
      status: 'done',
      updatedAt: Date.now()
    };

    // TODO: 调用实际的storage更新函数

    return {
      success: true,
      message: `✅ Task completed: "${updatedTask.title}"`,
      taskId,
      data: updatedTask
    };
  } catch (error) {
    console.error('Failed to complete task:', error);
    return {
      success: false,
      message: `❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 执行任务细化命令 (AI refine)
 * Calls server API to use AI for task refinement
 */
export async function executeRefineTask(
  taskId: string,
  context?: string,
  teamId?: string
): Promise<TaskCommandResult> {
  try {
    if (!teamId) {
      return {
        success: false,
        message: '❌ Failed to refine task: Missing teamId'
      };
    }

    const credentials = await TokenStorage.getCredentials();
    if (!credentials) {
      return {
        success: false,
        message: '❌ Failed to refine task: Not authenticated'
      };
    }

    const result = await refineTeamTask(credentials, teamId, taskId, context);
    const suggestions = Array.isArray(result.refinement?.suggestions) ? result.refinement!.suggestions : [];
    const title = result.task?.title || taskId;

    return {
      success: true,
      message: suggestions.length > 0
        ? `✨ Task refined: "${title}"\n\nSuggestions:\n${suggestions.map((s: string) => `• ${s}`).join('\n')}`
        : `✨ Task refined: "${title}"`,
      taskId,
      data: result
    };
  } catch (error) {
    console.error('Failed to refine task:', error);
    return {
      success: false,
      message: `❌ Failed to refine task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 执行任务重写命令 (AI rewrite)
 * Calls server API to use AI for task rewriting
 */
export async function executeRewriteTask(
  taskId: string,
  style: string = 'concise',
  teamId?: string
): Promise<TaskCommandResult> {
  try {
    if (!teamId) {
      return {
        success: false,
        message: '❌ Failed to rewrite task: Missing teamId'
      };
    }

    const credentials = await TokenStorage.getCredentials();
    if (!credentials) {
      return {
        success: false,
        message: '❌ Failed to rewrite task: Not authenticated'
      };
    }

    const result = await rewriteTeamTask(
      credentials,
      teamId,
      taskId,
      style as 'concise' | 'detailed' | 'technical' | 'user-friendly'
    );
    const rewrittenTitle = result.rewrite?.rewrittenTitle || result.task?.title || taskId;

    return {
      success: true,
      message: `✨ Task rewritten (${style} style): "${rewrittenTitle}"`,
      taskId,
      data: result
    };
  } catch (error) {
    console.error('Failed to rewrite task:', error);
    return {
      success: false,
      message: `❌ Failed to rewrite task: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * 获取命令帮助信息
 */
export function getCommandHelp(): string {
  return `
📝 可用命令:

/create task <title> [priority:low|medium|high|urgent] [assignee:@role]
  创建新任务
  示例: /create task Implement i18n priority:high assignee:@builder

/update task <taskId> [status:todo|in-progress|review|done] [priority:low|medium|high|urgent]
  更新任务
  示例: /update task task_123 status:in-progress

/assign task <taskId> to @role
  分配任务
  示例: /assign task task_123 to @builder

/complete task <taskId>
  完成任务
  示例: /complete task task_123

/task refine <taskId> [context...]
  使用 AI 细化任务描述，添加更多细节和验收标准
  示例: /task refine task_123 需要考虑移动端适配

/task rewrite <taskId> [style:concise|detailed|technical|user-friendly]
  使用 AI 重写任务标题和描述，改善清晰度
  示例: /task rewrite task_123 style:technical
  `.trim();
}
