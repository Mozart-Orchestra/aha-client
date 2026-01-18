# Phase 1.2 实施指南：从聊天创建任务

**实施时间**: 2026-01-18
**预计时间**: 2-3 小时
**负责人**: Framer (cmkj195b) - 主要，Builder (cmkj195z) - 支持

---

## 📋 目标

实现在 TeamChatRoom 中使用 `/task` 命令创建 Kanban 任务，并自动添加到看板。

---

## 🎯 用户交互流程

### 1. 用户在 TeamChatRoom 输入命令

```
/task 实现用户认证功能
#desc 需要支持 Google 和 GitHub OAuth 登录
#assign @builder
#priority high
#due 2026-01-25
#tags backend,security
```

### 2. 系统解析命令

系统识别这是一个任务创建命令，解析各个字段。

### 3. 创建任务并添加到看板

系统创建新任务并添加到团队的 Kanban 看板的 "todo" 列。

### 4. 发送通知到聊天

系统发送 `task-created` 类型的消息到团队聊天，所有成员可见。

### 5. @assignee 收到通知

如果指定了 @assignee，该成员会收到 @mention 通知。

---

## 🛠️ 实施步骤

### Step 1: 修改 TeamChatRoom.tsx

**文件**: `kanban/sources/components/TeamChatRoom.tsx`

#### 1.1 导入依赖

```typescript
import { parseTaskCommand, createTaskFromCommand } from '@/utils/taskHelpers';
import { randomUUID } from 'expo-crypto';
import { storage } from '@/sync/storage';
```

#### 1.2 添加命令检测逻辑

在 `sendMessage` 函数之前，添加命令解析：

```typescript
const handleTaskCommand = async (content: string, teamId: string) => {
    // 解析任务命令
    const parsed = parseTaskCommand(content);
    if (!parsed) {
        return null; // 不是任务命令
    }

    // 获取当前用户 session ID
    const mySessionId = storage.getState().mySessionId;
    if (!mySessionId) {
        Modal.alert('Error', 'Session ID not found');
        return null;
    }

    // 获取团队 artifact
    const artifact = storage.getState().artifacts[teamId];
    if (!artifact?.body) {
        Modal.alert('Error', 'Team data not found');
        return null;
    }

    // 解析 Kanban 数据
    const kanbanData = JSON.parse(artifact.body);

    // 检查是否有 todo 列
    const todoColumn = kanbanData.columns.find((col: any) => col.id === 'todo');
    if (!todoColumn) {
        Modal.alert('Error', 'Todo column not found');
        return null;
    }

    // 创建任务
    const task = createTaskFromCommand(
        parsed,
        randomUUID(), // 临时消息 ID
        mySessionId
    );

    // 添加任务到看板
    kanbanData.tasks.push(task);

    // 更新 artifact
    await sync.updateArtifact(
        teamId,
        artifact.title,
        JSON.stringify(kanbanData, null, 2),
        artifact.sessions,
        artifact.draft,
        artifact.type
    );

    // 发送通知到聊天
    const mentions = parsed.task.assigneeId ? [parsed.task.assigneeId] : [];

    await sync.sendTeamMessage({
        teamId,
        fromSessionId: mySessionId,
        content: `New task created: "${task.title}"`,
        shortContent: `Task created: ${task.title}`,
        type: 'task-created',
        mentions,
        metadata: {
            taskId: task.id,
            taskSnapshot: {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority
            }
        }
    });

    return task;
};
```

#### 1.3 修改 sendMessage 函数

在发送消息之前，检查是否是任务命令：

```typescript
const handleSend = async () => {
    if (!message.trim()) return;

    // 检查是否是任务命令
    if (message.trim().startsWith('/task')) {
        const task = await handleTaskCommand(message, teamId);
        if (task) {
            setMessage(''); // 清空输入框
            return;
        }
    }

    // 原有的发送消息逻辑
    await sync.sendTeamMessage({
        teamId,
        content: message,
        type: 'chat',
        // ... 其他字段
    });

    setMessage('');
};
```

---

### Step 2: 修改 teams/[id].tsx

**文件**: `kanban/sources/app/(app)/teams/[id].tsx`

这个文件主要负责显示看板，需要确保它能正确显示新创建的任务。

#### 2.1 确认任务渲染逻辑

确保任务卡片显示所有新字段：

```typescript
const renderTaskCard = (task: KanbanTask) => {
    return (
        <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => handleTaskPress(task)}
        >
            {/* 优先级标签 */}
            {task.priority && (
                <Text style={getPriorityStyle(task.priority)}>
                    {task.priority.toUpperCase()}
                </Text>
            )}

            {/* 任务标题 */}
            <Text style={styles.taskTitle}>{task.title}</Text>

            {/* 任务描述 */}
            {task.description && (
                <Text style={styles.taskDescription}>
                    {task.description}
                </Text>
            )}

            {/* 截止日期 */}
            {task.dueDate && (
                <Text style={styles.taskDueDate}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                </Text>
            )}

            {/* 标签 */}
            {task.tags && task.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {task.tags.map(tag => (
                        <Text key={tag} style={styles.tag}>#{tag}</Text>
                    ))}
                </View>
            )}

            {/* 分配给 */}
            {task.assigneeId && (
                <Text style={styles.taskAssignee}>@{task.assigneeId}</Text>
            )}

            {/* 来源标签 */}
            {task.source === 'ai' && task.approvalStatus === 'pending' && (
                <Text style={styles.pendingApproval}>⏳ Pending Approval</Text>
            )}
        </Pressable>
    );
};
```

---

### Step 3: 添加样式

**文件**: `kanban/sources/app/(app)/teams/[id].tsx`

添加新样式：

```typescript
const stylesheet = StyleSheet.create((theme) => ({
    // ... 现有样式

    priorityBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
        alignSelf: 'flex-start'
    },
    priorityLow: {
        backgroundColor: theme.colors.success + '20',
        color: theme.colors.success
    },
    priorityMedium: {
        backgroundColor: theme.colors.primary + '20',
        color: theme.colors.primary
    },
    priorityHigh: {
        backgroundColor: theme.colors.warning + '20',
        color: theme.colors.warning
    },
    priorityUrgent: {
        backgroundColor: theme.colors.error + '20',
        color: theme.colors.error
    },
    taskDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        marginBottom: 8
    },
    taskDueDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 4
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8
    },
    tag: {
        fontSize: 10,
        color: theme.colors.primary,
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 4,
        marginBottom: 4
    },
    pendingApproval: {
        fontSize: 11,
        color: theme.colors.warning,
        marginTop: 4,
        fontStyle: 'italic'
    }
}));
```

---

### Step 4: 测试

#### 4.1 单元测试

创建测试文件 `kanban/sources/utils/taskHelpers.test.ts`：

```typescript
import { parseTaskCommand, createTaskFromCommand } from '../taskHelpers';

describe('Task Command Parser', () => {
    test('should parse basic task command', () => {
        const content = '/task Implement login';
        const parsed = parseTaskCommand(content);

        expect(parsed).not.toBeNull();
        expect(parsed?.task.title).toBe('Implement login');
        expect(parsed?.task.priority).toBe('medium'); // 默认
    });

    test('should parse task with all flags', () => {
        const content = `
/task Implement OAuth
#desc Support Google and GitHub
#assign @builder
#priority high
#due 2026-01-25
#tags backend,security
        `.trim();

        const parsed = parseTaskCommand(content);

        expect(parsed?.task.title).toBe('Implement OAuth');
        expect(parsed?.task.description).toBe('Support Google and GitHub');
        expect(parsed?.task.assigneeId).toBe('builder');
        expect(parsed?.task.priority).toBe('high');
        expect(parsed?.task.dueDate).toBeDefined();
        expect(parsed?.task.tags).toEqual(['backend', 'security']);
    });

    test('should return null for non-task command', () => {
        const content = 'Hello team';
        const parsed = parseTaskCommand(content);
        expect(parsed).toBeNull();
    });
});
```

#### 4.2 手动测试

1. 打开团队聊天
2. 输入 `/task Test task`
3. 点击发送
4. 验证：
   - 任务出现在看板的 "todo" 列
   - 聊天中出现 "Task created: Test task" 消息
   - 如果指定了 @assignee，该成员收到通知

---

## 📊 验收标准

- [ ] 用户可以在 TeamChatRoom 输入 `/task` 命令
- [ ] 命令被正确解析（支持 #desc, #assign, #priority, #due, #tags）
- [ ] 新任务自动添加到看板的 "todo" 列
- [ ] 发送 `task-created` 通知到团队聊天
- [ ] 如果指定了 @assignee，该成员收到 @mention 通知
- [ ] 任务卡片显示所有字段（标题、描述、优先级、标签、截止日期）
- [ ] 错误处理完善（缺少字段、无效日期等）

---

## 🐛 常见问题

### Q1: 命令不被识别
**A**: 确保 `/task` 在消息的最开始，前面没有空格。

### Q2: 任务没有添加到看板
**A**: 检查：
- Kanban 数据是否正确解析
- Todo 列是否存在 (id === 'todo')
- Artifact 是否成功更新

### Q3: 通知没有发送
**A**: 检查：
- sync.sendTeamMessage 是否被调用
- teamId 是否正确
- 网络连接是否正常

### Q4: @assignee 没有收到通知
**A**: 确认：
- mentions 数组是否包含 assigneeId（不带 @）
- 成员是否在线
- 成员的消息监听是否正常

---

## 🚀 后续优化

1. **命令自动补全**：输入 `/task` 后显示可用标志提示
2. **任务预览**：发送前显示任务预览，确认后再创建
3. **模板支持**：保存常用任务模板，快速创建
4. **批量创建**：一次创建多个任务
5. **任务编辑**：在聊天中编辑任务（`/edit-task`）

---

**实施时间**: 预计 2-3 小时
**验收时间**: 预计 1 小时
**总时间**: 3-4 小时

**负责人**: Framer (cmkj195b) - 主要
**支持**: Builder (cmkj195z)
**测试**: QA (cmkj197d)
**文档**: Scribe (cmkj196y)
