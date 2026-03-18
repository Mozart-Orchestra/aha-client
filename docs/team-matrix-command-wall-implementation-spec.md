# Team Matrix Command Wall Implementation Spec

> Companion doc for `docs/team-matrix-command-wall-plan.md`
> Status: implementation-ready proposal
> Date: 2026-03-18

## 1. Primary objective

把现有团队页从“单一 tab 容器”升级为“双模式工作区”：

- `standard`: 正常团队协作页
- `matrix`: command wall

V1 目标不是做完整 remote desktop，而是做一个高密度、稳定、可派工的 team operation wall。

## 2. Existing code constraints

### 2.1 Current team page

当前团队页在 `sources/app/(app)/teams/[id].tsx` 中直接维护：

- 路由 tab 状态
- team roster
- task board
- workspace sidebar
- matrix view

问题：

- 页面职责过重
- `matrix` 仍被建模为 `tab`
- matrix 相关状态没有独立持久化模型

### 2.2 Current matrix prototype

`sources/components/team/MatrixView.tsx` 已有这些能力：

- meta-first 排序
- 预设网格推荐
- 左侧 task sidebar
- web drag/drop
- active task 浮层

但还有明显缺口：

- 没有 session preview
- 没有 `Recommended` 一键恢复
- 没有真实派工消息
- rail task 与 docked task 没有单一归属规则

### 2.3 Current assignment flow limitation

当前团队页通过：

```ts
taskChatSync.updateTaskWithSync(taskId, { assigneeId: agentSessionId }, actorName)
```

来处理 matrix drop。

这只会：

1. 更新 task
2. 自动发一条通用 task-update 消息

它不会：

- 发带 `mentions` 的定向派工消息
- 体现“这是 matrix drop 派工”
- 避免后续出现重复通知

因此 V1 需要专门的 matrix assignment flow。

## 3. State model

## 3.1 Route params

建议把团队页路由参数调整为：

```ts
type TeamWorkspaceMode = 'standard' | 'matrix';
type TeamStandardTab = 'chat' | 'board' | 'info' | 'evolution';
```

```text
/teams/[id]?mode=matrix
/teams/[id]?mode=standard&tab=chat
/teams/[id]?mode=standard&tab=board
```

规则：

- `mode=matrix` 时忽略 `tab`
- `mode=standard` 时 `tab` 缺失则默认 `chat`
- 继续兼容老链接中的 `tab=matrix`
  - 进入时自动归一化为 `mode=matrix`

## 3.2 Local persisted preference

当前 `LocalSettings` 没有 team workspace 偏好字段，建议新增：

```ts
type TeamWorkspacePreference = {
    mode: 'standard' | 'matrix';
    standardTab: 'chat' | 'board' | 'info' | 'evolution';
    matrixGrid?: { cols: number; rows: number };
    matrixTasksVisible?: boolean;
    updatedAt: number;
};
```

```ts
teamWorkspacePreferences: Record<string, TeamWorkspacePreference>;
```

落点：

- `sources/sync/localSettings.ts`
- `sources/sync/storage.ts`

规则：

- key = `teamId`
- 路由参数优先级高于本地设置
- 页面首次打开时：
  - route override > local preference > default

## 3.3 Page local state

团队页保留轻量运行时状态：

```ts
selectedTaskId: string | null;
selectedAgentId: string | null;
draggingTaskId: string | null;
showWorkspaceDrawer: boolean;
showMenu: boolean;
```

以下状态不建议长期停留在页面内：

- grid recommendation logic
- roster ordering logic
- rail vs docked selection logic

这些应该抽到 `teamMatrix` util 或 hook。

## 4. Component boundaries

建议目标结构：

```text
TeamDashboardScreen
  TeamWorkspaceHeader
    TeamDisplayModeSwitch
    StandardTabSwitch (only in standard mode)
    MatrixToolbar (only in matrix mode)

  StandardWorkspace
    TeamChatRoom / Kanban / Info / Evolution

  MatrixWorkspace
    TaskRail
    MatrixGrid
      MatrixSessionTile
        DockedTaskChip
        SessionPreviewBody
```

## 4.1 TeamDisplayModeSwitch

职责：

- 展示 `Standard` / `Matrix`
- 切换时同步 route + local preference

建议放置：

- desktop: 团队页 header 右上区域
- mobile: tab 区上方或工作区按钮内

## 4.2 MatrixToolbar

职责：

- 展示推荐布局状态
- 提供网格切换
- 提供 `Tasks` rail toggle
- 提供 `Recommended` reset

建议 props：

```ts
type MatrixToolbarProps = {
    currentGrid: GridConfig;
    recommendedGrid: GridConfig;
    tasksVisible: boolean;
    onSelectGrid: (grid: GridConfig) => void;
    onResetRecommended: () => void;
    onToggleTasks: () => void;
};
```

## 4.3 TaskRail

职责：

- 展示未 dock 的任务
- 支持 web drag
- 支持 mobile long-press selection fallback

建议 props：

```ts
type TaskRailProps = {
    tasks: KanbanTask[];
    draggingTaskId: string | null;
    onDragStart: (taskId: string) => void;
    onDragEnd: () => void;
    onTaskPress?: (taskId: string) => void;
};
```

## 4.4 MatrixSessionTile

职责：

- 展示 agent 身份、状态、runtime
- 展示 docked task
- 展示只读 session preview
- 接收 task drop
- 点击进入完整 session

建议 props：

```ts
type MatrixSessionTileProps = {
    entry: MatrixRosterEntry;
    dockedTask: KanbanTask | null;
    preview: MatrixSessionPreview;
    draggingTaskId: string | null;
    onOpenSession: (sessionId: string) => void;
    onAssignTask: (taskId: string, sessionId: string) => void;
};
```

## 5. Data contracts

## 5.1 Matrix roster entry

建议把当前 `MatrixRosterEntry` 扩到可直接支撑 tile：

```ts
type MatrixRosterEntry = {
    member: KanbanTeamMember;
    session: Session | undefined;
    role: KanbanTeamRole | undefined;
    index: number;
    tasks: KanbanTask[];
    activeTask: ActiveTaskSummary | null;
    isMeta: boolean;
    runtimeLabel?: string;
    statusLabel: 'offline' | 'idle' | 'working' | 'waiting' | 'unknown';
};
```

其中：

- `isMeta` 不要在渲染期每次重新推导
- `statusLabel` 不要散落在组件内部重复计算

## 5.2 Session preview contract

V1 建议新增：

```ts
type MatrixSessionPreview = {
    lastMessageText?: string;
    lastMessageAt?: number;
    messageCount?: number;
    totalTokens?: number;
    pendingRequestCount?: number;
    thinkingSince?: number;
    connectionState: 'online' | 'offline' | 'unknown';
};
```

数据来源建议：

- `useSession(sessionId)`
- `useSessionMessages(sessionId)`
- `useSessionUsage(sessionId)`

回退规则：

- `messages` 未加载时，preview 允许为空
- `totalTokens` 先取 `useSessionUsage(sessionId)`，再回退 `session.latestUsage`
- `pendingRequestCount` 取 `session.agentState?.requests`

## 5.3 Docked task rule

V1 采用单一归属：

- 如果 task 对某 session 存在 active execution link，则该 task dock 到该 session
- 否则如果 task `assigneeId === sessionId` 且状态为 `in-progress`，也 dock
- 其他任务留在 rail

注意：

- 一个 task 在 V1 只允许 dock 到一个 tile
- supporting execution link 暂不在 UI 中拆多份

## 6. Util and hook extraction

建议新增 `sources/utils/teamMatrix.ts`

推荐导出：

```ts
export type GridConfig = { cols: number; rows: number };

export function getRecommendedGrid(agentCount: number, viewportWidth?: number): GridConfig;
export function sortMatrixRoster(entries: MatrixRosterEntry[]): MatrixRosterEntry[];
export function getDockedTaskForSession(tasks: KanbanTask[], sessionId: string): KanbanTask | null;
export function getRailTasks(tasks: KanbanTask[], roster: MatrixRosterEntry[]): KanbanTask[];
export function buildMatrixAssignmentMessage(args: {
    task: KanbanTask;
    assigneeSessionId: string;
    assigneeDisplayName: string;
    actorName: string;
}): SendTeamMessageRequest;
```

测试建议直接围绕这个 util 写。

## 7. Assignment flow design

## 7.1 Recommended API shape

不要直接在 matrix 里继续调用裸 `updateTaskWithSync`。

建议新增一个专用 helper：

```ts
assignTaskFromMatrix(taskId, assigneeSessionId, actorName)
```

落点可选：

- `useTaskChatSync.ts`
- 或团队页局部 helper

推荐做法：扩到 `useTaskChatSync.ts`，因为这本来就是 task/chat 联动入口。

## 7.2 Recommended flow

```text
drop task on tile
  -> update task assignee
  -> send one explicit task-assigned message with mentions
  -> optimistic UI update
```

建议消息内容：

```text
@Builder Please take #task-123 Fix session preview grid layout
```

建议 metadata：

```ts
{
    taskId,
    taskSnapshot: { id, title, status, priority },
    assignmentSource: 'matrix-drop',
    assignmentMode: 'direct',
    taskChange: {
        field: 'assigneeId',
        oldValue,
        newValue: assigneeSessionId,
    },
}
```

## 7.3 Notification duplication risk

如果仍然先调 `updateTaskWithSync`，再额外 `sendTeamMessage`，会出现双消息：

1. 通用 task-update
2. 明确 task-assigned

V1 推荐二选一：

- 方案 A，推荐：给 `updateTaskWithSync` 增加 `suppressNotification`
- 方案 B：新增 `assignTaskWithSync`，内部只发一条 task-assigned

推荐选 A，侵入更小。

## 8. UI behavior details

## 8.1 Standard mode

- 保持现有布局
- tab 仅显示：`chat / board / info / evolution`
- `matrix` 从 tab 中移除

## 8.2 Matrix mode

- header 显示：
  - mode switch
  - recommended button
  - grid selector
  - tasks toggle
- 页面主体：
  - 左 rail
  - 右 grid

## 8.3 Empty cells

当 grid 容量大于 agent 数量时：

- 继续保留空 cell
- 但空 cell 不显示“可 drop”含义
- 避免用户以为能把 task 拖到空白位创建 agent

## 8.4 Mobile fallback

mobile V1 用降级模式：

- grid 上限 2 列
- task rail 默认收起
- 长按 task 后，再点击目标 tile 完成分配

不要追求移动端原生 drag/drop 完整一致。

## 9. File-by-file change plan

## 9.1 `sources/app/(app)/teams/[id].tsx`

改动内容：

- 引入 `mode` 概念
- 处理老 `tab=matrix` 兼容
- `standard` 模式下仅渲染四 tab
- `matrix` 模式下渲染 command wall
- route + local preference 同步
- 引入 `assignTaskFromMatrix`

建议结果：

- 页面主要只负责 orchestration
- matrix 细节尽量下沉

## 9.2 `sources/components/team/MatrixView.tsx`

改动内容：

- 去掉“自己同时维护全部 matrix 规则”的职责
- 接收外部已经算好的：
  - sorted roster
  - rail tasks
  - recommended grid
- 内部聚焦渲染与交互

## 9.3 `sources/components/team/MatrixSessionTile.tsx`

新增文件，负责：

- tile frame
- drop target
- preview area
- docked task

## 9.4 `sources/components/team/TaskRail.tsx`

新增文件，负责：

- rail header
- task row
- drag source
- empty state

## 9.5 `sources/utils/teamMatrix.ts`

新增文件，负责：

- stable ordering
- recommended grid
- dock/rail selector
- assignment message builder

## 9.6 `sources/hooks/useTaskChatSync.ts`

建议扩展：

- `updateTaskWithSync(taskId, updates, actorName, options?)`

```ts
type UpdateTaskSyncOptions = {
    suppressNotification?: boolean;
};
```

或新增：

```ts
assignTaskWithSync(...)
```

## 9.7 `sources/sync/localSettings.ts`

新增：

- `teamWorkspacePreferences`

并更新默认值、schema、parse。

## 10. Test plan

## 10.1 Pure util tests

新增建议：

- `sources/utils/teamMatrix.spec.ts`

覆盖：

- meta-first stable sort
- recommended grid selection
- rail task filtering
- docked task selection
- assignment message build

## 10.2 Interaction tests

如果当前测试基础允许，可补：

- `MatrixView` web drop 行为
- `mode` route normalization

## 10.3 Manual acceptance matrix

至少验证这些场景：

1. 2 agents -> 推荐 `2x2`
2. 5 agents -> 推荐 `2x3`
3. 9 agents -> 推荐 `3x3`
4. meta agents 始终在前
5. active task 从 rail 消失并 dock
6. drop 后 team chat 出现带 mention 的派工消息
7. refresh 后仍记住 mode 与 grid
8. mobile 不出现不可用 drag 状态

## 11. Recommended first coding batch

建议现在真正开工时只做这一批：

### Batch A

- `sources/sync/localSettings.ts`
- `sources/utils/teamMatrix.ts`
- `sources/app/(app)/teams/[id].tsx`

目标：

- 先把 `mode` 和 `matrix` state model 立住
- 先把排序/推荐布局/持久化从页面里抽出来
- 暂时还不拆 preview tile

### Batch B

- `sources/components/team/MatrixView.tsx`
- `sources/components/team/MatrixSessionTile.tsx`
- `sources/components/team/TaskRail.tsx`

目标：

- 做出真正的 command wall UI

### Batch C

- `sources/hooks/useTaskChatSync.ts`
- 团队页 matrix 派工调用点

目标：

- 完成 `assign + mention`

## 12. Final recommendation

下一步不需要继续讨论抽象层了，可以直接进入 Batch A。

Batch A 做完后，这个需求就会从“想法”变成“可运行的产品骨架”。
