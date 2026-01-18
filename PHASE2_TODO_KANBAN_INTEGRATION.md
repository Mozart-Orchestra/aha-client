# Phase 2: Todo-Kanban 集成方案

## 📊 系统分析

### Todo 系统结构

**TodoItem 接口:**
```typescript
export interface TodoItem {
    id: string;
    title: string;
    done: boolean;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    linkedSessions?: {
        [sessionId: string]: {
            title: string;
            linkedAt: number;
        }
    };

    // 🆕 Kanban 集成字段 (已扩展)
    kanbanTaskId?: string;  // 关联的 Kanban 任务 ID
    teamId?: string;        // 所属团队 ID
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    dueDate?: number;
}
```

**Todo 核心操作:**
- `addTodo()` - 创建新 Todo
- `updateTodoTitle()` - 更新标题
- `toggleTodo()` - 切换完成状态
- `deleteTodo()` - 删除 Todo
- `reorderTodos()` - 重新排序
- `updateTodoLinkedSessions()` - 更新关联的会话

### KanbanTask 结构

```typescript
export interface KanbanTask {
    id: string;
    title: string;
    description?: string;
    status: string;  // todo, in-progress, review, done
    assigneeId?: string | null;
    reporterId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: number;
    updatedAt: number;

    // 嵌套任务支持
    parentTaskId?: string | null;
    subtaskIds?: string[];
    depth?: number;

    // 执行链接
    executionLinks?: TaskExecutionLink[];

    // 阻塞追踪
    blockers?: TaskBlocker[];

    // Chat-Board 集成字段
    relatedMessageIds?: string[];
    dueDate?: number;
    tags?: string[];

    // Todo 集成字段
    todoId?: string;  // 关联的 Todo ID
}
```

---

## 🎯 Phase 2 集成方案

### 方案概述

实现 **Todo ↔ Kanban 双向同步**:
1. 从 Todo 创建 Kanban 任务
2. Kanban 任务状态同步回 Todo
3. Todo 完成时自动完成关联的 Kanban 任务
4. Kanban 任务完成时自动完成关联的 Todo

### 数据映射

**Todo → Kanban Task 映射:**

| TodoItem | KanbanTask | 说明 |
|----------|------------|------|
| `id` | `todoId` | Todo ID 作为外键 |
| `title` | `title` | 标题直接映射 |
| `done` | `status` | `done=true` → `status='done'` |
| `priority` | `priority` | 直接映射 |
| `tags` | `tags` | 直接映射 |
| `dueDate` | `dueDate` | 直接映射 |
| N/A | `description` | 可扩展 Todo 添加描述 |
| N/A | `assigneeId` | 可扩展 Todo 添加负责人 |
| N/A | `status` | `done=false` → `status='todo'` |

**状态映射:**

| Todo.done | KanbanTask.status |
|-----------|-------------------|
| `false` | `'todo'` |
| `true` | `'done'` |

---

## 🔧 实施步骤

### Phase 2.1: 从 Todo 创建 Kanban 任务

**触发条件:**
- 用户在 Todo 列表点击"转换为任务"按钮
- 或者 Todo 被拖拽到 Kanban 面板

**实现流程:**

1. **用户操作**
   ```typescript
   // TodoList 组件中
   <Pressable onPress={() => convertTodoToKanban(todo)}>
     <Text>转换为任务</Text>
   </Pressable>
   ```

2. **转换函数**
   ```typescript
   export async function convertTodoToKanban(
       todo: TodoItem,
       teamId: string,
       assigneeId?: string
   ): Promise<KanbanTask> {
       // 1. 创建 Kanban 任务
       const newTask: KanbanTask = {
           id: randomUUID(),
           title: todo.title,
           description: `从 Todo 转换`,
           status: todo.done ? 'done' : 'todo',
           priority: todo.priority || 'medium',
           tags: todo.tags || [],
           dueDate: todo.dueDate,
           todoId: todo.id,  // 关联到 Todo
           assigneeId: assigneeId,
           reporterId: storage.getState().profile.id,
           createdAt: todo.createdAt,
           updatedAt: Date.now()
       };

       // 2. 添加到 Kanban board
       const board = getKanbanBoard(teamId);
       board.tasks.push(newTask);

       // 3. 更新 Kanban artifact
       await sync.updateArtifact(
           teamId,
           board.title,
           JSON.stringify(board, null, 2),
           board.sessions,
           board.draft,
           board.type
       );

       // 4. 更新 Todo 的 kanbanTaskId
       await updateTodoKanbanLink(todo.id, newTask.id, teamId);

       // 5. 发送通知到团队聊天
       await sendTaskCreatedNotification(newTask, teamId);

       return newTask;
   }
   ```

3. **更新 Todo 链接**
   ```typescript
   async function updateTodoKanbanLink(
       todoId: string,
       kanbanTaskId: string,
       teamId: string
   ): Promise<void> {
       const currentState = storage.getState();
       const todo = currentState.todoState?.todos[todoId];

       if (todo) {
           const updatedTodo: TodoItem = {
               ...todo,
               kanbanTaskId,
               teamId,
               updatedAt: Date.now()
           };

           // 更新到服务器
           const auth = (await import('@/auth/AuthContext')).getCurrentAuth();
           if (auth?.credentials) {
               const todoKey = getTodoKey(todoId);
               const encrypted = await encryptTodoData(updatedTodo);
               await kvSet(auth.credentials, todoKey, encrypted, -1);
           }

           // 更新本地状态
           storage.getState().updateTodo(updatedTodo);
       }
   }
   ```

### Phase 2.2: Kanban 任务状态同步到 Todo

**触发条件:**
- Kanban 任务状态改变 (todo ↔ in-progress ↔ review ↔ done)
- 任务被删除

**实现流程:**

1. **监听任务状态变化**
   ```typescript
   // 在 teams/[id].tsx 的 handleMoveTaskStatus 中
   const handleMoveTaskStatus = async (task: KanbanTask) => {
       const oldStatus = task.status;
       const newStatus = getNextStatus(task.status);

       // 移动任务
       await taskChatSync.updateTaskWithSync(
           task.id,
           { status: newStatus },
           myDisplayName
       );

       // 🆕 同步到关联的 Todo
       if (task.todoId) {
           await syncKanbanTaskToTodo(task.id, newStatus);
       }
   };
   ```

2. **同步函数**
   ```typescript
   export async function syncKanbanTaskToTodo(
       kanbanTaskId: string,
       kanbanStatus: string
   ): Promise<void> {
       // 1. 查找关联的 Todo
       const currentState = storage.getState();
       const todoId = Object.keys(currentState.todoState?.todos || {})
           .find(id => currentState.todoState?.todos[id]?.kanbanTaskId === kanbanTaskId);

       if (!todoId) return;

       // 2. 映射状态
       const todoDone = kanbanStatus === 'done';

       // 3. 如果状态不同,更新 Todo
       const todo = currentState.todoState.todos[todoId];
       if (todo && todo.done !== todoDone) {
           await toggleTodo(currentState.auth.credentials, todoId);
       }
   }
   ```

### Phase 2.3: Todo 完成时完成 Kanban 任务

**触发条件:**
- 用户点击 Todo 完成按钮

**实现流程:**

1. **增强 toggleTodo 函数**
   ```typescript
   export async function toggleTodo(
       credentials: AuthCredentials,
       id: string
   ): Promise<void> {
       const currentState = storage.getState();
       const todo = currentState.todoState?.todos[id];

       if (!todo) return;

       const wasDone = todo.done;
       const willBeDone = !wasDone;

       // 原有的切换逻辑...

       // 🆕 如果标记为完成,同时完成关联的 Kanban 任务
       if (willBeDone && !wasDone && todo.kanbanTaskId) {
           await completeKanbanTask(todo.kanbanTaskId);
       }

       // 🆕 如果取消完成,同时取消 Kanban 任务完成
       if (!willBeDone && wasDone && todo.kanbanTaskId) {
           await uncompleteKanbanTask(todo.kanbanTaskId);
       }
   }
   ```

2. **完成 Kanban 任务**
   ```typescript
   async function completeKanbanTask(kanbanTaskId: string): Promise<void> {
       // 查找任务所属的 team
       const teamId = await findTeamIdByTaskId(kanbanTaskId);
       if (!teamId) return;

       const artifact = storage.getState().artifacts[teamId];
       if (!artifact?.body) return;

       const board: KanbanBoard = JSON.parse(artifact.body);
       const task = board.tasks.find(t => t.id === kanbanTaskId);

       if (task && task.status !== 'done') {
           // 更新任务状态为 done
           task.status = 'done';
           task.updatedAt = Date.now();

           // 保存到服务器
           await sync.updateArtifact(
               teamId,
               artifact.title,
               JSON.stringify(board, null, 2),
               artifact.sessions,
               artifact.draft,
               artifact.type
           );

           // 发送通知
           await sendTaskCompletedNotification(task, teamId);
       }
   }
   ```

### Phase 2.4: UI 集成 ✅ **已完成**

**实现的功能:**

1. **TodoView 组件增强** (`sources/-zen/components/TodoView.tsx`):
   - 添加 `kanbanTaskId`, `teamId`, `onConvertToTask`, `onViewTask` props
   - 为未关联的 Todo 显示"转任务"按钮
   - 为已关联的 Todo 显示"已关联"按钮
   - 按钮样式与主题颜色一致

2. **TodoList 组件增强** (`sources/-zen/components/TodoList.tsx`):
   - 扩展类型定义支持 Kanban 字段
   - 传递转换和查看回调函数

3. **ZenHome 主页面集成** (`sources/-zen/ZenHome.tsx`):
   - `handleConvertTodoToTask`: 处理 Todo 到 Kanban 任务的转换
     - 检查用户是否有团队
     - 调用 `convertTodoToKanban` 函数
     - 创建 Kanban 任务并更新 artifact
     - 显示成功提示并导航到团队页面
   - `handleViewKanbanTask`: 导航到关联的 Kanban 任务

**UI 效果:**
- 未关联 Todo: 显示蓝色"转任务"按钮
- 已关联 Todo: 显示绿色"已关联"按钮
- 点击"转任务"触发转换流程
- 点击"已关联"跳转到团队 Kanban 面板

**已修改文件:**
- ✅ `sources/-zen/components/TodoView.tsx` - UI 元素
- ✅ `sources/-zen/components/TodoList.tsx` - Props 传递
- ✅ `sources/-zen/ZenHome.tsx` - 业务逻辑

---

## 📊 数据流图

```
Todo 列表          Kanban Board
    │                   │
    │ 1. 点击"转为任务"     │
    ├────────────────────→┤
    │                    │
    │ 2. 创建 KanbanTask  │
    │    - 映射字段       │
    │    - 设置 todoId    │
    │                    │
    │ 3. 更新 Todo        │
    │    - kanbanTaskId   │
    │    - teamId         │
    │                    │
    │ 4. 发送通知        │
    │                    │
    │                    │
    │ 5. 任务移动状态     │
    │    ←────────────────┤
    │    6. 同步状态到 Todo│
    │                    │
    │                    │
    │ 7. Todo 完成时       │
    ├────────────────────→┤
    │    8. 完成关联任务   │
    │                    │
    └────────────────────┘
```

---

## 🎯 验收标准

### 功能性
- ✅ 从 Todo 列表可以创建 Kanban 任务
- ✅ Kanban 任务显示关联的 Todo ID
- ✅ Kanban 任务状态改变时同步 Todo 状态
- ✅ Todo 完成时自动完成关联的 Kanban 任务
- ✅ Todo 取消完成时自动取消 Kanban 任务完成
- ✅ 删除 Kanban 任务时取消 Todo 关联

### UI/UX
- ✅ Todo 卡片显示"转任务"按钮
- ✅ 已关联的 Todo 显示任务链接
- ✅ 点击链接跳转到 Kanban 任务详情
- ✅ 状态同步时有视觉反馈

### 数据一致性
- ✅ Todo 和 Kanban 任务状态保持同步
- ✅ 双向链接正确维护
- ✅ 冲突解决机制

---

## 📝 关键文件

**已完成修改:**
1. ✅ `sources/-zen/model/ops.ts` - 添加 Todo-Kanban 转换函数 (Phase 2.1-2.3)
2. ✅ `sources/-zen/components/TodoView.tsx` - 添加"转任务"和"已关联"UI 按钮
3. ✅ `sources/-zen/components/TodoList.tsx` - 传递 Kanban 相关 props
4. ✅ `sources/-zen/ZenHome.tsx` - 实现转换和查看处理逻辑

---

## ⏱️ 实际完成时间

- Phase 2.1: 从 Todo 创建 Kanban 任务 ✅ (已完成)
- Phase 2.2: Kanban 状态同步到 Todo ✅ (已完成)
- Phase 2.3: Todo 完成时同步 Kanban ✅ (已完成)
- Phase 2.4: UI 集成 ✅ (已完成 - 2026-01-18)

**Phase 2 状态: 100% 完成**

---

*创建时间: 2026-01-18 10:35*
*Phase 2 完成时间: 2026-01-18*
*状态: ✅ 完成*
