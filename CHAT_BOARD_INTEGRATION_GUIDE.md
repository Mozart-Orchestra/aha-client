# Chat-Board 双向集成使用指南

## 📋 概述

本文档说明如何使用 **Chat（群聊）** 和 **Board（看板）** 的双向联动功能。

---

## 🎯 核心功能

### 1. 从聊天创建任务 ✨

**支持的触发词**：
```
创建任务：修复登录页面Bug
new task: Implement user authentication
todo: Review PR #123
待办：更新文档
```

**自动行为**：
1. 系统检测到触发词
2. 自动解析任务标题和描述
3. 在看板中创建新任务
4. 在聊天中发送确认消息

**示例对话**：
```
用户: 创建任务：优化首页加载速度
    > 当前加载时间需要从3秒优化到1秒内

系统: ✅ 已创建任务：优化首页加载速度
     #task-abc-123
```

---

### 2. 在聊天中引用任务 📌

**支持的格式**：
```
#task-123
@task:456
[Task:789]
```

**功能**：
- 点击引用跳转到看板任务
- 显示任务状态卡片
- 快速查看任务详情

**示例**：
```
我正在处理 #task-abc-123，预计今天完成。
```

显示效果：
```
┌─────────────────────────────┐
│ 📋 优化首页加载速度          │
├─────────────────────────────┤
│ 状态: In Progress           │
│ 优先级: High                │
│ ID: abc-123                 │
└─────────────────────────────┘
```

---

### 3. 任务变更自动通知 📢

**触发场景**：
- ✅ 拖动任务到新列
- ✅ 修改任务状态
- ✅ 分配任务给成员
- ✅ 标记任务完成

**自动通知**：
```
系统消息: 任务状态变更：优化首页加载速度

To Do → In Progress

#task-abc-123
```

---

### 4. 双向关联 🔗

**任务 → 消息**：
- 查看任务时显示相关讨论
- 追溯决策历史
- 上下文完整保留

**消息 → 任务**：
- 从讨论创建任务
- 将消息关联到任务
- 完整的审计追踪

---

## 💻 开发者集成

### 使用 `useTaskChatSync` Hook

```typescript
import { useTaskChatSync } from '@/hooks/useTaskChatSync';

function TeamDashboard() {
    const {
        // 数据
        taskLinks,
        getTaskStats,

        // 操作
        getMessagesForTask,
        getTasksForMessage,
        updateTaskWithSync,
        createTaskFromMessage,
        linkMessageToTask,
    } = useTaskChatSync({
        teamId: 'team-123',
        tasks: kanbanData.tasks,
        messages: teamMessages,
        onTaskUpdate: async (taskId, updates) => {
            await desktopBridge.updateTask(taskId, updates);
        },
        onMessageSend: async (message) => {
            await desktopBridge.sendTeamMessage(message);
        },
        onTaskCreate: async (taskData) => {
            return await desktopBridge.createTask(taskData);
        },
    });

    // 示例：创建任务
    const handleCreateTask = async (messageContent: string) => {
        const task = await createTaskFromMessage(
            messageContent,
            currentSessionId,
            currentUser.name
        );

        if (task) {
            console.log('任务已创建:', task);
        }
    };

    // 示例：更新任务并通知
    const handleMoveTask = async (taskId: string, newStatus: string) => {
        await updateTaskWithSync(taskId, { status: newStatus }, '用户');
    };

    return (
        // UI 组件
    );
}
```

---

### 使用工具函数

```typescript
import {
    extractTaskIds,
    formatTaskReference,
    generateTaskMessage,
} from '@/utils/taskChatSync';

// 从消息中提取任务ID
const message = "我正在处理 #task-123 和 #task-456";
const taskIds = extractTaskIds(message); // ['123', '456']

// 格式化任务引用
const ref = formatTaskReference({ id: 'abc-123', title: '修复Bug' });
// "#task-abc-123"

// 生成任务消息
const task = { id: '123', title: '登录Bug', status: 'To Do' };
const msg = generateTaskMessage('created', task, '张三');
```

---

## 🎨 UI 集成示例

### 1. 聊天输入框增强

```typescript
{detectTaskCreation && (
    <TaskCreationPrompt
        onConfirm={(taskData) => createTaskFromMessage(...)}
        onCancel={() => setDetectTaskCreation(false)}
    />
)}
```

### 2. 消息列表中显示任务卡片

```typescript
{message.metadata?.taskId && (
    <TaskCard
        taskId={message.metadata.taskId}
        onPress={() => navigateToTask(message.metadata.taskId)}
    />
)}
```

### 3. 看板任务中显示相关消息

```typescript
{getMessagesForTask(task.id).length > 0 && (
    <MessageIndicator
        count={getMessagesForTask(task.id).length}
        onPress={() => showTaskMessages(task.id)}
    />
)}
```

---

## 📊 数据流图

```
┌─────────────────────────────────────────────────┐
│                   用户操作                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│              useTaskChatSync Hook                │
│  ┌─────────────┐        ┌─────────────┐        │
│  │  Chat API   │        │  Task API   │        │
│  └──────┬──────┘        └──────┬──────┘        │
└─────────┼──────────────────────┼────────────────┘
          ↓                      ↓
    ┌─────────────┐      ┌─────────────┐
    │ TeamMessage │      │ KanbanTask  │
    │   (存储)     │      │   (存储)     │
    └─────────────┘      └─────────────┘
          ↓                      ↓
    ┌─────────────────────────────────┐
    │      双向同步（自动）           │
    │  - 任务引用检测                 │
    │  - 状态变更通知                 │
    │  - 消息关联更新                 │
    └─────────────────────────────────┘
```

---

## 🚀 高级功能

### 1. 批量操作

```typescript
// 批量创建任务
const tasks = await Promise.all([
    createTaskFromMessage('todo: 任务1', sessionId),
    createTaskFromMessage('todo: 任务2', sessionId),
    createTaskFromMessage('todo: 任务3', sessionId),
]);
```

### 2. 智能关联

```typescript
// 自动将消息关联到相关任务
await linkMessageToTask(messageId, taskId);

// 查看所有相关讨论
const relatedMessages = getMessagesForTask(taskId);
```

### 3. 全局任务视图

```typescript
const stats = getTaskStats();
console.log(`
任务统计：
- 总数: ${stats.total}
- 进行中: ${stats.byStatus['in-progress']}
- 已完成: ${stats.byStatus['done']}
- 高优先级: ${stats.byPriority['high']}
- 已关联讨论: ${stats.linkedTasks}
`);
```

---

## ⚠️ 注意事项

### 1. 性能优化
- 大量消息时使用虚拟列表
- 任务引用缓存
- 防抖自动创建功能

### 2. 数据一致性
- 任务删除时清理关联
- 消息删除时更新链接
- 定期同步检查

### 3. 用户体验
- 提供手动取消自动创建的选项
- 明确的视觉反馈
- 错误处理和重试

### 4. 安全性

#### 输入验证
- 验证触发关键词以防止注入攻击
- 检查任务标题和描述长度上限
- 验证优先级和状态值的有效性

#### XSS 防护
- 转义任务引用渲染中的 HTML 特殊字符
- 使用 DOMPurify 或类似工具清理用户输入
- 对任务标题和描述进行 HTML 实体编码

#### 权限检查
- 验证用户是否有创建任务的权限
- 检查查看和编辑任务的操作权限
- 实施团队级别的访问控制

#### 速率限制
- 对自动创建功能进行节流（如每分钟最多 5 个任务）
- 限制单个用户的命令触发频率
- 防止恶意批量创建任务

#### 敏感信息保护
- 避免在任务标题中包含密码、密钥等敏感信息
- 对任务描述中的敏感数据进行掩码处理
- 记录任务创建操作的审计日志

---

## 📝 TODO（未来功能）

- [ ] 任务模板快速创建
- [ ] 消息中直接编辑任务
- [ ] 任务依赖关系可视化
- [ ] 附件关联
- [ ] @提醒特定成员
- [ ] 任务时间线视图

---

**文档版本**: 1.0
**最后更新**: 2026-01-18
**维护者**: Dev118 Team
