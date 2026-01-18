# Chat-Board 集成测试指南

## 📋 概述

本文档描述了 Chat 和 Board (Kanban) 双向同步功能的完整测试流程和使用方法。

**当前状态**: ✅ 核心功能已完成 (Phase 1-3: 95%)

---

## 🎯 功能清单

### ✅ 已实现功能

#### 1. **从聊天创建任务**
- ✅ 自然语言检测："创建任务"、"新建任务"、"todo:"
- ✅ 命令创建：`/create task`, `/task`
- ✅ 自动关联消息到任务
- ✅ 自动发送创建通知

#### 2. **任务状态同步到聊天**
- ✅ 任务移动自动通知
- ✅ 任务更新自动通知
- ✅ 详细变更信息显示

#### 3. **任务引用和链接**
- ✅ `#task-xxx` 格式引用
- ✅ 消息自动关联到任务
- ✅ 任务卡片在聊天中显示

#### 4. **任务详情**
- ✅ 点击任务打开详情弹窗
- ✅ Discuss 按钮跳转到聊天
- ✅ 查看相关消息
- ✅ 编辑任务信息

---

## 🧪 测试场景

### 场景 1: 从聊天创建任务 (自然语言)

**步骤**:
1. 打开团队聊天页面
2. 在输入框输入：`创建任务：实现用户登录功能`
3. 发送消息

**预期结果**:
- ✅ 系统自动创建任务
- ✅ 任务标题：`实现用户登录功能`
- ✅ 任务状态：`todo`
- ✅ 聊天显示：`✅ 已创建任务：**实现用户登录功能**\n\n#task-xxx`
- ✅ Board 的 "todo" 列出现新任务

**测试命令**:
```bash
# 中文
"创建任务：优化首页加载速度"
"新建任务：添加搜索功能"
"任务：实现用户权限管理"

# 英文
"add task: fix login bug"
"create task: improve performance"
"todo: add dark mode"
```

---

### 场景 2: 使用命令创建任务

**步骤**:
1. 在聊天输入：`/create task 实现API接口 priority:high assignee:@builder`
2. 发送消息

**预期结果**:
- ✅ 任务创建成功
- ✅ 优先级：`high`
- ✅ 分配给：`@builder`
- ✅ 系统显示确认消息

**支持的命令参数**:
- `priority:` low/medium/high/urgent
- `assignee:` @roleId
- `status:` todo/in-progress/review/done
- `#desc:` 任务描述

---

### 场景 3: 任务状态更新通知

**步骤**:
1. 在 Board 标签查看任务
2. 点击任务卡片（打开详情）
3. 或者长按任务卡片（快速移动）
4. 移动任务到 "In Progress"

**预期结果**:
- ✅ 任务状态更新为 `in-progress`
- ✅ 切换到 Chat 标签
- ✅ 显示系统消息：`📝 用户 将 'xxx' 移至 In Progress`
- ✅ 消息包含任务引用 `#task-xxx`

---

### 场景 4: 任务引用和讨论

**步骤**:
1. 在聊天输入：`关于 #task-abc123 的进展如何？`
2. 发送消息

**预期结果**:
- ✅ 消息自动关联到任务
- ✅ 消息下方显示任务卡片
- ✅ 点击任务卡片可查看详情

---

### 场景 5: Discuss 按钮功能

**步骤**:
1. 在 Board 点击任务卡片
2. 打开任务详情弹窗
3. 点击 "Discuss" 按钮

**预期结果**:
- ✅ 详情弹窗关闭
- ✅ 自动切换到 Chat 标签
- ✅ 控制台输出：`Discussing task: xxx Found N related messages`

---

## 🔄 数据流验证

### 流程 1: Chat → Board

```
用户输入
  ↓
检测任务创建关键词
  ↓
taskChatSync.createTaskFromMessage()
  ↓
onTaskCreate() → 创建任务
  ↓
更新 Kanban 数据
  ↓
发送确认消息到 Chat
  ↓
Board 显示新任务 ✅
```

### 流程 2: Board → Chat

```
用户移动任务
  ↓
handleMoveTaskStatus()
  ↓
taskChatSync.updateTaskWithSync()
  ↓
onTaskUpdate() → 更新任务
  ↓
创建通知消息
  ↓
onMessageSend() → 发送到 Chat
  ↓
Chat 显示通知 ✅
```

---

## 📁 相关文件

### 核心文件
| 文件 | 功能 | 行数 |
|------|------|------|
| `hooks/useTaskChatSync.ts` | 同步 Hook | ~267 |
| `utils/taskChatSync.ts` | 工具函数 | ~284 |
| `components/TaskDetailModal.tsx` | 任务详情 | ~571 |
| `components/TeamChatRoom.tsx` | 聊天室 | ~870 |
| `app/(app)/teams/[id].tsx` | 团队页面 | ~810 |

### 类型定义
| 文件 | 说明 |
|------|------|
| `sync/kanbanTypes.ts` | KanbanTask 接口扩展 |
| `sync/teamMessageTypes.ts` | TeamMessage 接口扩展 |
| `utils/taskHelpers.ts` | 任务工具函数 |

---

## 🐛 已知问题

### 1. Discuss 按钮功能不完整
- **状态**: 部分实现
- **问题**: 切换到 Chat 后没有滚动到相关消息
- **解决方案**: 需要在 TeamChatRoom 添加 ref 支持滚动定位

### 2. 消息更新 API 缺失
- **状态**: 待实现
- **位置**: `useTaskChatSync.ts:196`
- **影响**: 无法追溯添加任务引用到旧消息

---

## 🚀 下一步计划

### Phase 4: TodoList 全局视图
- [ ] 创建 TodoList 组件
- [ ] 任务筛选和搜索
- [ ] 跨项目任务视图
- [ ] 任务依赖管理

### 优化功能
- [ ] Discuss 按钮自动滚动
- [ ] 任务快速操作菜单
- [ ] @任务通知
- [ ] 任务统计图表

---

## 📊 验收标准

### Phase 1-3 完成标准

- ✅ 用户可以从聊天创建任务
- ✅ 任务状态变更自动通知到聊天
- ✅ 消息可以引用和关联任务
- ✅ 任务详情可查看和编辑
- ✅ Discuss 按钮可跳转到聊天
- ✅ 双向数据同步正常工作

**当前状态**: 95% 完成 🎉

---

## 💡 使用技巧

### 创建任务的最佳实践

1. **使用明确的关键词**
   ```
   ✅ "创建任务：实现登录功能"
   ❌ "我们需要登录功能"
   ```

2. **添加详细描述**
   ```
   创建任务：实现登录功能
   描述：支持邮箱和手机号登录，包含验证码功能
   ```

3. **设置优先级和分配**
   ```
   /create task 修复登录bug priority:urgent assignee:@builder
   ```

### 任务讨论的最佳实践

1. **使用任务引用**
   ```
   #task-abc123 这个任务的进度如何？
   ```

2. **在任务详情中点击 Discuss**
   - 自动切换到聊天
   - 查看所有相关消息

---

## 🔍 调试技巧

### 查看任务-消息映射

```typescript
// 在团队页面控制台
console.log(taskChatSync.taskLinks);

// 查看某个任务的相关消息
const messages = taskChatSync.getMessagesForTask('task-xxx');
console.log(messages);
```

### 查看任务统计

```typescript
const stats = taskChatSync.getTaskStats();
console.log(stats);
// { total: 10, byStatus: {...}, byPriority: {...}, linkedTasks: 5 }
```

---

## 📞 反馈

如发现问题或有改进建议，请：
1. 创建 GitHub Issue
2. @mention Master Agent
3. 在团队聊天中讨论

---

**最后更新**: 2026-01-18
**版本**: v1.0.0-alpha
**状态**: Phase 1-3 完成，Phase 4 待开发
