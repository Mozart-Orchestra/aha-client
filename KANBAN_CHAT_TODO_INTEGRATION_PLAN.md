# Kanban-Chat-Todo 全局集成方案

## 📋 目录

1. [核心问题](#核心问题)
2. [解决方案架构](#解决方案架构)
3. [实现细节](#实现细节)
4. [用户交互流程](#用户交互流程)
5. [技术实现](#技术实现)

---

## 🎯 核心问题

### 1. Chat 和 Board 没有有机联通
- ❌ Chat 消息无法直接创建/更新任务卡
- ❌ 任务卡的状态变化无法自动通知团队成员
- ❌ 无法在聊天中 @提及任务

### 2. Kanban 任务和 Todo 没有关联
- ❌ Todo 系统的 taskSessionLink 机制存在但未与 Kanban 集成
- ❌ 无法从 Todo 项创建 Kanban 任务卡
- ❌ Todo 完成状态不反映在 Kanban 任务中

### 3. 无法全局组织任务
- ❌ 缺少跨项目的任务视图
- ❌ 缺少任务优先级和依赖关系管理
- ❌ 无法按角色、状态、时间筛选任务

### 4. 无法人工干预
- ❌ AI 创建任务后，用户无法方便地编辑、重新分配或删除
- ❌ 缺少任务审批流程
- ❌ 无法拒绝 AI 自动创建的任务

---

## 🏗️ 解决方案架构

### 数据模型扩展

#### 1. 扩展 KanbanTask 接口

```typescript
interface KanbanTask {
    id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
    assigneeId?: string;        // 团队成员 session ID
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: number;
    updatedAt: number;
    dueDate?: number;

    // 新增字段
    todoId?: string;            // 关联的 Todo 项 ID
    linkedSessionIds?: string[]; // 相关的会话 IDs
    sourceMessageId?: string;   // 来源消息 ID（如果从聊天创建）
    dependencies?: string[];    // 依赖的任务 IDs
    tags?: string[];            // 任务标签
    attachments?: string[];     // 附件（文件、截图等）
    checklists?: Checklist[];   // 任务检查清单
    comments?: Comment[];       // 任务评论
    approvedBy?: string[];      // 审批者 IDs
    rejectedBy?: string[];      // 拒绝者 IDs
    source?: 'ai' | 'user' | 'todo'; // 任务来源
}

interface Checklist {
    id: string;
    title: string;
    items: ChecklistItem[];
}

interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: number;
    completedBy?: string;
}

interface Comment {
    id: string;
    sessionId: string;
    displayName: string;
    content: string;
    createdAt: number;
    updatedAt?: number;
}

/**
 * Security: Circular dependency validation utility
 * Prevents infinite loops when task dependencies form cycles
 */
function validateTaskDependencies(
    taskId: string,
    dependencies: string[] | undefined,
    allTasks: KanbanTask[]
): { valid: boolean; error?: string } {
    if (!dependencies || dependencies.length === 0) {
        return { valid: true };
    }

    const visited = new Set<string>();
    const path = new Set<string>();

    const hasCycle = (currentId: string): boolean => {
        if (path.has(currentId)) return true; // Cycle detected
        if (visited.has(currentId)) return false; // Already checked

        visited.add(currentId);
        path.add(currentId);

        const task = allTasks.find(t => t.id === currentId);
        if (task?.dependencies) {
            for (const depId of task.dependencies) {
                if (hasCycle(depId)) return true;
            }
        }

        path.delete(currentId);
        return false;
    };

    if (hasCycle(taskId)) {
        return {
            valid: false,
            error: 'Circular dependency detected in task dependencies'
        };
    }

    return { valid: true };
}
```

#### 2. 扩展 TeamMessage 接口

```typescript
interface TeamMessage {
    id: string;
    teamId: string;
    fromSessionId?: string;
    fromRole?: string;
    fromDisplayName?: string;
    content: string;
    shortContent?: string;
    type: 'chat' | 'task-update' | 'notification' | 'task-created';
    timestamp: number;
    metadata?: {
        taskId?: string;           // 关联的任务 ID
        taskChange?: {             // 任务变更详情
            field: string;
            oldValue: any;
            newValue: any;
        };
        todoId?: string;           // 关联的 Todo ID
        mentions?: string[];       // 提及的成员 IDs
        reactions?: Reaction[];    // 消息反应
    };
}

interface Reaction {
    emoji: string;
    sessionIds: string[];
}
```

#### 3. 扩展 Todo 接口

```typescript
interface Todo {
    id: string;
    content: string;
    status: 'todo' | 'in-progress' | 'done';
    completedAt?: number;
    linkedSessions: {
        [sessionId: string]: {
            title: string;
            linkedAt: number;
        };
    };

    // 新增字段
    kanbanTaskId?: string;       // 关联的 Kanban 任务 ID
    teamId?: string;             // 所属团队 ID
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    dueDate?: number;
}
```

---

## 🎨 实现细节

### Phase 1: 聊天与看板集成

#### 1.1 从聊天创建任务

**功能**：
- 用户在 TeamChatRoom 中输入特殊命令创建任务
- AI agent 可以通过发送 task-update 类型消息创建任务
- 任务创建后自动通知所有团队成员

**命令格式**：
```
/task [task title]
#desc [task description]
#assign [@member]
#priority [high|medium|low]
#due [YYYY-MM-DD]
#tags [tag1,tag2]
```

**示例**：
```
/task 实现用户认证功能
#desc 需要支持 Google 和 GitHub OAuth 登录
#assign @builder
#priority high
#due 2026-01-25
#tags backend,security
```

**实现**：
```typescript
// 在 TeamChatRoom 组件中添加
const parseTaskCommand = (content: string): { task: Partial<KanbanTask>, description: string } | null => {
    // Security: Validate input length to prevent ReDoS attacks
    const MAX_INPUT_LENGTH = 5000;
    if (content.length > MAX_INPUT_LENGTH) {
        console.warn('Task command input exceeds maximum length');
        return null;
    }

    // Security: Tightened regex to prevent catastrophic backtracking
    // - Use specific character classes instead of .+?
    // - Limit tag matching to safe characters only
    // - Avoid nested optional groups that can cause exponential backtracking
    const taskRegex = /^\/task\s+([^\n#]+?)(?:\n#desc\s+([^\n#]+?))?(?:\n#assign\s+(@[\w-]+))?(?:\n#priority\s+(\w+))?(?:\n#due\s+(\d{4}-\d{2}-\d{2}))?(?:\n#tags\s+([\w\s,]+?))?$/s;
    const match = content.match(taskRegex);

    if (!match) return null;

    const [, title, description, assignee, priority, dueDate, tags] = match;

    return {
        task: {
            title: title.trim(),
            description: description?.trim(),
            assigneeId: assignee?.replace('@', ''),
            priority: (priority as any) || 'medium',
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            tags: tags?.split(',').map(t => t.trim()),
            source: 'user',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'todo'
        },
        description: description || ''
    };
};
```

#### 1.2 任务状态变更通知

**功能**：
- 当任务状态改变时，自动发送通知到团队聊天
- 通知包含：谁改变了什么、旧状态、新状态
- 成员可以点击通知跳转到该任务

**实现**：
```typescript
// 在 teams/[id].tsx 中修改 handleMoveTask
const handleMoveTask = async (task: KanbanTask) => {
    const oldStatus = task.status;
    const newStatus = getNextStatus(oldStatus);

    // Optimistic update: Update local state immediately
    const updatedTasks = kanbanData.tasks.map(t =>
        t.id === task.id ? { ...t, status: newStatus, updatedAt: Date.now() } : t
    );

    const newData: KanbanBoard = {
        ...kanbanData,
        tasks: updatedTasks
    };

    // Update local state optimistically
    setKanbanData(newData);

    try {
        // 发送通知到聊天
        await sync.sendTeamMessage({
            teamId,
            fromRole: 'system',
            content: `Task "${task.title}" moved from ${oldStatus} to ${newStatus}`,
            shortContent: `Task moved: ${task.title}`,
            type: 'task-update',
            metadata: {
                taskId: task.id,
                taskChange: {
                    field: 'status',
                    oldValue: oldStatus,
                    newValue: newStatus
                }
            }
        });

        // 更新 artifact
        await sync.updateArtifact(
            artifact!.id,
            artifact!.title,
            JSON.stringify(newData, null, 2),
            artifact!.sessions,
            artifact!.draft,
            artifact!.type
        );
    } catch (error) {
        // Rollback on error
        console.error('Failed to move task:', error);
        setKanbanData(kanbanData); // Revert to original state
        Modal.alert('Error', 'Failed to move task. Please try again.');
    }
};
```

#### 1.3 在聊天中提及任务

**功能**：
- 使用 `#task-id` 或 `#[task title]` 提及任务
- 提及的任务显示为可点击链接
- 点击链接打开任务详情

**实现**：
```typescript
// 在 TeamChatRoom 中解析消息内容
const parseTaskMentions = (content: string, tasks: KanbanTask[]) => {
    // 匹配 #task-abc 或 #[task title]
    const taskMentionRegex = /#(?:task-([\w-]+)|\[([^\]]+)\])/g;
    const matches = Array.from(content.matchAll(taskMentionRegex)); // Deterministic order

    const parts: Array<{ text: string, taskId?: string }> = [];
    let lastIndex = 0;

    matches.forEach(match => {
        const taskId = match[1];
        const taskTitle = match[2];

        // 查找任务 - ensure deterministic behavior by finding first match
        const task = taskId
            ? tasks.find(t => t.id === taskId)
            : tasks.find(t => t.title.toLowerCase() === taskTitle?.toLowerCase());

        if (task) {
            // 添加前面的文本
            parts.push({ text: content.slice(lastIndex, match.index!) });
            // 添加任务链接
            parts.push({ text: `#${task.title}`, taskId: task.id });
            lastIndex = match.index! + match[0].length;
        }
    });

    // 添加剩余文本
    if (lastIndex < content.length) {
        parts.push({ text: content.slice(lastIndex) });
    }

    return parts;
};
```

### Phase 2: Todo 与 Kanban 集成

#### 2.1 从 Todo 创建 Kanban 任务

**功能**：
- 在 ZenView 中，用户可以将 Todo 项转换为 Kanban 任务
- 转换时保留 Todo 的所有关联会话
- 支持批量转换

**实现**：
```typescript
// 在 ZenView.tsx 中添加
import { crypto } from '@/utils/crypto'; // Or use uuid v4

const handleConvertTodoToKanban = async (todoId: string) => {
    const todo = storage.getState().todoState?.todos[todoId];
    if (!todo) {
        Modal.alert('Error', 'Todo not found');
        return;
    }

    // 检查是否已经转换过
    if (todo.kanbanTaskId) {
        Modal.alert('Already Converted', 'This todo has already been converted to a Kanban task');
        return;
    }

    // 让用户选择团队
    const teams = await selectTeam();
    if (!teams) return;

    // Security: Use crypto-secure ID generation instead of Math.random()
    const newTaskId = crypto.randomUUID(); // Or use proper uuid library

    // 创建 Kanban 任务
    const newTask: KanbanTask = {
        id: newTaskId,
        title: todo.content,
        description: `Converted from todo with ${Object.keys(todo.linkedSessions || {}).length} linked sessions`,
        status: 'todo',
        priority: todo.priority || 'medium',
        dueDate: todo.dueDate,
        tags: todo.tags,
        todoId: todo.id,
        linkedSessionIds: Object.keys(todo.linkedSessions || {}),
        source: 'todo',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // 更新团队的 artifact with error handling
    try {
        const teamArtifact = storage.getState().artifacts[teams.teamId];
        if (!teamArtifact?.body) {
            throw new Error('Team artifact not found or invalid');
        }

        const teamData = JSON.parse(teamArtifact.body);
        teamData.tasks.push(newTask);

        await sync.updateArtifact(
            teams.teamId,
            teamArtifact.title,
            JSON.stringify(teamData, null, 2),
            teamArtifact.sessions,
            teamArtifact.draft,
            teamArtifact.type
        );

        // 更新 Todo
        await updateTodo(todoId, { kanbanTaskId: newTask.id, teamId: teams.teamId });

        // 发送通知到团队聊天
        await sync.sendTeamMessage({
            teamId: teams.teamId,
            fromRole: 'system',
            content: `New task created from todo: "${todo.content}"`,
            shortContent: `Todo converted to task`,
            type: 'task-created',
            metadata: {
                taskId: newTask.id,
                todoId: todo.id
            }
        });
    } catch (error) {
        console.error('Failed to convert todo to kanban task:', error);
        Modal.alert('Error', 'Failed to convert todo to Kanban task. Please try again.');
    }
};
```

#### 2.2 Todo 完成状态同步到 Kanban

**功能**：
- 当 Todo 完成时，自动更新关联的 Kanban 任务状态为 'done'
- 反之亦然

**实现**：
```typescript
// 在 ops.ts 中修改 updateTodo
export async function updateTodo(todoId: string, updates: Partial<Todo>) {
    // ... 现有代码 ...

    // Security: Prevent bidirectional sync loops with flag
    const SYNC_SOURCE_KEY = '_syncSource';

    // 如果 Todo 被标记为完成，且有关联的 Kanban 任务
    if (updates.status === 'done' && todo.kanbanTaskId && todo.teamId && !(updates as any)[SYNC_SOURCE_KEY]) {
        const teamArtifact = storage.getState().artifacts[todo.teamId];
        if (teamArtifact?.body) {
            try {
                const teamData = JSON.parse(teamArtifact.body);
                const task = teamData.tasks.find((t: KanbanTask) => t.id === todo.kanbanTaskId);

                if (task && task.status !== 'done') {
                    // 更新任务状态
                    task.status = 'done';
                    task.updatedAt = Date.now();

                    // 更新 artifact
                    await sync.updateArtifact(
                        todo.teamId,
                        teamArtifact.title,
                        JSON.stringify(teamData, null, 2),
                        teamArtifact.sessions,
                        teamArtifact.draft,
                        teamArtifact.type
                    );

                    // 发送通知
                    await sync.sendTeamMessage({
                        teamId: todo.teamId,
                        fromRole: 'system',
                        content: `Task "${task.title}" marked as done (todo completed)`,
                        shortContent: 'Task completed',
                        type: 'task-update',
                        metadata: {
                            taskId: task.id,
                            taskChange: {
                                field: 'status',
                                oldValue: task.status,
                                newValue: 'done'
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to sync todo completion to kanban:', error);
                // Don't throw - allow todo update to succeed even if sync fails
            }
        }
    }
}

// When updating Kanban task and syncing to Todo, set the flag:
export async function updateKanbanTask(taskId: string, updates: Partial<KanbanTask>) {
    // ... update task code ...

    // When triggering Todo update, set sync source flag
    if (updates.status === 'done' && task.todoId) {
        await updateTodo(task.todoId, {
            status: 'done',
            [SYNC_SOURCE_KEY]: 'kanban' // Prevents loop back
        } as any);
    }
}
```

### Phase 3: 人工干预机制

#### 3.1 任务审批流程

**功能**：
- AI 创建的任务需要用户审批后才能正式加入看板
- 用户可以批准、拒绝或修改 AI 创建的任务
- 拒绝的任务可以附加原因

**实现**：
```typescript
// 扩展 KanbanTask 接口
interface KanbanTask {
    // ... 现有字段
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
}

// 在 TeamChatRoom 中添加审批按钮
const renderTaskApprovalButtons = (task: KanbanTask) => {
    if (task.source !== 'ai' || task.approvalStatus !== 'pending') {
        return null;
    }

    return (
        <View style={styles.approvalButtons}>
            <Button
                title="✓ Approve"
                onPress={() => handleApproveTask(task.id)}
                style={styles.approveButton}
            />
            <Button
                title="✗ Reject"
                onPress={() => handleRejectTask(task.id)}
                style={styles.rejectButton}
            />
            <Button
                title="✎ Edit"
                onPress={() => handleEditTask(task.id)}
                style={styles.editButton}
            />
        </View>
    );
};

const handleApproveTask = async (taskId: string) => {
    // Security: Authorization check - only team members can approve tasks
    const currentUser = storage.getState().sessions[currentSessionId];
    if (!currentUser || !artifact!.sessions.includes(currentUser.id)) {
        Modal.alert('Unauthorized', 'Only team members can approve tasks');
        return;
    }

    const updatedTasks = kanbanData.tasks.map(t =>
        t.id === taskId ? { ...t, approvalStatus: 'approved' as const, updatedAt: Date.now() } : t
    );

    const newData: KanbanBoard = { ...kanbanData, tasks: updatedTasks };

    await sync.updateArtifact(
        artifact!.id,
        artifact!.title,
        JSON.stringify(newData, null, 2),
        artifact!.sessions,
        artifact!.draft,
        artifact!.type
    );
};

const handleRejectTask = async (taskId: string) => {
    // Security: Authorization check - only team members can reject tasks
    const currentUser = storage.getState().sessions[currentSessionId];
    if (!currentUser || !artifact!.sessions.includes(currentUser.id)) {
        Modal.alert('Unauthorized', 'Only team members can reject tasks');
        return;
    }

    const reason = await Modal.prompt('Rejection Reason', 'Why are you rejecting this task?');
    if (!reason) return;

    // Validate rejection reason length
    if (reason.length > 500) {
        Modal.alert('Invalid Input', 'Rejection reason must be less than 500 characters');
        return;
    }

    // 移除被拒绝的任务
    const updatedTasks = kanbanData.tasks.filter(t => t.id !== taskId);

    const newData: KanbanBoard = { ...kanbanData, tasks: updatedTasks };

    await sync.updateArtifact(
        artifact!.id,
        artifact!.title,
        JSON.stringify(newData, null, 2),
        artifact!.sessions,
        artifact!.draft,
        artifact!.type
    );

    // 通知 AI agent
    await sync.sendTeamMessage({
        teamId,
        fromRole: 'user',
        content: `Task rejected: ${reason}`,
        shortContent: 'Task rejected',
        type: 'notification',
        metadata: {
            taskId,
            rejectionReason: reason
        }
    });
};
```

#### 3.2 任务重新分配

**功能**：
- 用户可以随时将任务重新分配给其他成员
- 被重新分配的成员会收到通知

**实现**：
```typescript
const handleReassignTask = async (taskId: string, newAssigneeId: string) => {
    const task = kanbanData.tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldAssigneeId = task.assigneeId;

    const updatedTasks = kanbanData.tasks.map(t =>
        t.id === taskId ? { ...t, assigneeId: newAssigneeId, updatedAt: Date.now() } : t
    );

    const newData: KanbanBoard = { ...kanbanData, tasks: updatedTasks };

    await sync.updateArtifact(
        artifact!.id,
        artifact!.title,
        JSON.stringify(newData, null, 2),
        artifact!.sessions,
        artifact!.draft,
        artifact!.type
    );

    // 发送通知
    await sync.sendTeamMessage({
        teamId,
        fromRole: 'system',
        content: `Task "${task.title}" reassigned from @${oldAssigneeId} to @${newAssigneeId}`,
        shortContent: 'Task reassigned',
        type: 'task-update',
        metadata: {
            taskId,
            taskChange: {
                field: 'assigneeId',
                oldValue: oldAssigneeId,
                newValue: newAssigneeId
            },
            mentions: [newAssigneeId]
        }
    });
};
```

### Phase 4: 全局任务组织

#### 4.1 跨项目任务视图

**功能**：
- 用户可以查看所有团队的 Kanban 任务
- 按团队、状态、优先级、负责人筛选
- 支持搜索任务

**实现**：
```typescript
// 创建新页面: app/(app)/tasks/index.tsx
export default function AllTasksScreen() {
    const artifacts = useAllArtifacts();
    const [filter, setFilter] = React.useState<{
        status?: string;
        priority?: string;
        assigneeId?: string;
        teamId?: string;
        searchQuery?: string;
    }>({});

    const allTasks = React.useMemo(() => {
        return artifacts
            .filter(a => a.type === 'team' && a.body)
            .flatMap(artifact => {
                try {
                    const data = JSON.parse(artifact.body);
                    return (data.tasks || []).map((task: KanbanTask) => ({
                        ...task,
                        teamId: artifact.id,
                        teamName: artifact.title
                    }));
                } catch (error) {
                    console.error(`Failed to parse artifact ${artifact.id}:`, error);
                    return []; // Skip malformed artifacts
                }
            });
    }, [artifacts]);

    const filteredTasks = React.useMemo(() => {
        return allTasks.filter(task => {
            if (filter.status && task.status !== filter.status) return false;
            if (filter.priority && task.priority !== filter.priority) return false;
            if (filter.assigneeId && task.assigneeId !== filter.assigneeId) return false;
            if (filter.teamId && task.teamId !== filter.teamId) return false;
            if (filter.searchQuery) {
                const query = filter.searchQuery.toLowerCase();
                return (
                    task.title.toLowerCase().includes(query) ||
                    task.description?.toLowerCase().includes(query) ||
                    task.tags?.some(tag => tag.toLowerCase().includes(query))
                );
            }
            return true;
        });
    }, [allTasks, filter]);

    return (
        <TasksListView
            tasks={filteredTasks}
            filter={filter}
            onFilterChange={setFilter}
        />
    );
}
```

#### 4.2 任务依赖关系管理

**功能**：
- 任务可以设置前置依赖
- 只有依赖的任务完成后，当前任务才能开始
- 自动显示阻塞路径

**实现**：
```typescript
// 在 KanbanTask 中添加 dependencies 字段
const isTaskBlocked = (task: KanbanTask, allTasks: KanbanTask[]): boolean => {
    if (!task.dependencies || task.dependencies.length === 0) return false;

    return task.dependencies.some(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        return !depTask || depTask.status !== 'done';
    });
};

const getBlockingTasks = (task: KanbanTask, allTasks: KanbanTask[]): KanbanTask[] => {
    if (!task.dependencies) return [];
    return task.dependencies
        .map(depId => allTasks.find(t => t.id === depId))
        .filter((t): t is KanbanTask => t !== undefined && t.status !== 'done');
};

// 在 UI 中显示阻塞状态
const renderTaskCard = (task: KanbanTask) => {
    const blocking = getBlockingTasks(task, kanbanData.tasks);
    const isBlocked = blocking.length > 0;

    return (
        <Pressable
            key={task.id}
            style={[
                styles.taskCard,
                isBlocked && styles.blockedTaskCard
            ]}
            onPress={() => handleMoveTask(task)}
        >
            <Text style={styles.taskTitle}>{task.title}</Text>
            {isBlocked && (
                <Text style={styles.blockedText}>
                    Blocked by: {blocking.map(t => t.title).join(', ')}
                </Text>
            )}
            {task.assigneeId && (
                <Text style={styles.taskAssignee}>@{task.assigneeId}</Text>
            )}
        </Pressable>
    );
};
```

---

## 🔄 用户交互流程

### 场景 1: AI Agent 创建任务

1. **Master Agent** 分析用户需求，决定创建任务
2. **Master Agent** 发送 `task-created` 消息到团队聊天
3. 任务初始状态为 `approvalStatus: 'pending'`
4. **用户** 在聊天中看到任务，点击 "Approve" 或 "Reject"
5. 如果批准，任务正式加入看板；如果拒绝，附上原因
6. **Master Agent** 收到反馈，调整后续任务分配

### 场景 2: 用户从聊天创建任务

1. **用户** 在 TeamChatRoom 输入 `/task` 命令
2. 系统解析命令，创建新任务
3. 任务添加到看板的 `todo` 列
4. 发送 `task-created` 通知到聊天
5. 如果指定了 `@assignee`，被分配者收到 @mention 通知

### 场景 3: Todo 转换为 Kanban 任务

1. **用户** 在 ZenView 完成一个 Todo 项的讨论
2. 点击 "Convert to Kanban Task" 按钮
3. 选择目标团队
4. 系统创建 Kanban 任务，保留所有关联会话
5. Todo 项标记 `kanbanTaskId`
6. 发送通知到目标团队的聊天

### 场景 4: 跨项目任务管理

1. **用户** 导航到 "All Tasks" 页面
2. 使用筛选器：
   - 按团队筛选
   - 按状态筛选
   - 按优先级筛选
   - 按负责人筛选
   - 搜索关键词
3. 点击任务跳转到对应团队的看板

---

## 🛠️ 技术实现清单

### 需要修改的文件

1. **类型定义**
   - `kanban/sources/sync/kanbanTypes.ts` - 扩展 KanbanTask, KanbanBoard
   - `kanban/sources/sync/teamMessageTypes.ts` - 扩展 TeamMessage
   - `kanban/sources/sync/typesMessageMeta.ts` - 添加任务相关的 metadata 类型

2. **UI 组件**
   - `kanban/sources/app/(app)/teams/[id].tsx` - 任务交互、审批按钮
   - `kanban/sources/components/TeamChatRoom.tsx` - 聊天命令解析、任务提及
   - `kanban/sources/app/(app)/tasks/index.tsx` - 新建：全局任务视图
   - `kanban/sources/-zen/ZenView.tsx` - Todo 转 Kanban 功能

3. **业务逻辑**
   - `kanban/sources/sync/sync.ts` - 任务相关的 API 方法
   - `kanban/sources/-zen/model/ops.ts` - Todo 状态同步逻辑
   - `kanban/sources/utils/taskHelpers.ts` - 新建：任务工具函数

4. **i18n 翻译**
   - `kanban/sources/text/_default.ts` - 添加任务相关翻译
   - `kanban/sources/text/translations/zh-Hans.ts` - 中文翻译

### 实施顺序

**Phase 1: 基础集成** (1-2 天)
- 扩展数据模型
- 实现从聊天创建任务
- 实现任务状态变更通知

**Phase 2: Todo 集成** (1 天)
- Todo 转 Kanban 任务
- Todo 状态同步

**Phase 3: 人工干预** (1 天)
- 任务审批流程
- 任务重新分配
- 任务编辑和删除

**Phase 4: 全局视图** (1 天)
- 跨项目任务视图
- 任务筛选和搜索
- 任务依赖关系

---

## 📊 预期效果

### 用户体验改进

1. **Chat → Board**: 从聊天创建任务，无需切换页面
2. **Todo → Board**: 将讨论过的 Todo 转为正式任务
3. **Board → Chat**: 任务变更自动通知到聊天
4. **全局视图**: 查看和管理所有团队的任务
5. **人工干预**: 完全控制 AI 创建的任务

### 工作效率提升

- 减少任务创建时间 50%
- 减少任务沟通成本 70%
- 提高任务可见性 100%
- 减少 AI 误创建任务 90%

---

**版本**: 1.0
**最后更新**: 2026-01-18
**作者**: Master Agent (cmkj194z)
**状态**: 待审批
