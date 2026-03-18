# Team Matrix Command Wall Plan

> Status: proposal
> Scope: `kanban` team workspace UI
> Primary route: `sources/app/(app)/teams/[id].tsx`
> Date: 2026-03-17
> Implementation spec: `docs/team-matrix-command-wall-implementation-spec.md`

## 1. Goal

为团队工作区增加第二种展示模式：

- `Standard mode`: 保留现有 `chat / board / info / evolution`
- `Matrix mode`: 将团队内所有 agents 的工作窗口以矩阵方式释放到右侧，形成一个可总览、可派工、可快速跳转的 command wall

这个模式不是“再加一个功能 tab”，而是“团队工作区的第二种视图体系”。

## 2. Why now

当前代码已经有可复用基础：

- 团队页已有 `matrix` tab：`sources/app/(app)/teams/[id].tsx`
- 已有矩阵排序 / 网格推荐 / 左侧任务栏 / 拖拽分配原型：`sources/components/team/MatrixView.tsx`
- 已有 team sidebar，可列出所有 team：`sources/app/(app)/teams/[id].tsx`

但当前实现还不是用户想要的“疯狂视图”：

1. `Matrix` 还是第 5 个 tab，不是工作区层级的模式切换
2. tile 还是轻卡片，不是 session activity window
3. task drop 只更新 `assigneeId`，没有显式触发一次 `@agent` 派工消息
4. 已执行中的 task 仍会留在左侧，不会真正 dock 到 agent 上方

## 3. Product definition

### 3.1 Two display modes

- `standard`
  - 内部保留四个 tab：`chat / board / info / evolution`
  - 继续作为默认、安全、低密度视图
- `matrix`
  - 右侧主区域切换为 matrix wall
  - 面向“指挥 / 调度 / 同时观察多个 agent”

### 3.2 Matrix mode layout

#### Left rail

- 细栏显示未完成任务
- 默认展示：
  - `todo`
  - `in-progress`
  - `review`
  - `blocked`
  - `pending approval`
- 已被某个 agent 正在执行的任务，不再继续保留在 rail 中；改为 dock 到对应 agent tile 顶部

#### Top-right controls

- `Recommended` 按钮
  - 一键回到推荐布局
- `Grid` 选择器
  - `2x2`
  - `2x3`
  - `3x3`
  - `4x3`
  - `2x4`
  - `3x4`
  - `4x4`
- `Tasks` 按钮
  - 控制左侧 task rail 展开 / 收起

#### Main wall

- 每个 agent 占一个 tile
- tile 显示：
  - agent 名称
  - role badge
  - online / waiting / working / idle 状态
  - runtime (`Claude` / `Codex`)
  - 当前 active task
  - 轻量 session preview
  - 快速打开完整 session 的入口

### 3.3 Agent ordering

排序规则必须稳定：

1. meta agents 永远在最前
   - `org-manager`
   - `master`
   - `orchestrator`
   - `supervisor`
2. 非 meta agents 保持原始团队顺序，不重新洗牌
3. 不允许因为活跃时间、消息时间、usage 变化而动态跳位

### 3.4 Task drag semantics

从左侧 rail 把 task 拖到 agent tile 时，语义不是“改字段”，而是“给 agent 派单”：

1. 更新 task `assigneeId`
2. 发送一条 team message
3. message 必须包含目标 agent 的 `mentions`
4. UI 上立即把 task 从 rail 移走，并 dock 到该 agent tile 顶部

这相当于一次显式 `@agent 请处理这个 task`

## 4. UX principles

### 4.1 Command wall, not Kanban clone

Matrix mode 的目标不是复制 Board，而是强调：

- 并行感
- 占用感
- 调度感
- 在场感

### 4.2 Session preview, not full session embed

V1 不建议在 9-12 个 tile 中直接挂完整 `SessionView`。

原因：

- `sources/-session/SessionView.tsx` 过重
- 多实例输入框 / 实时状态 / 草稿 / header 会带来明显性能和复杂度风险
- 桌面端可能很快出现多 session 同屏卡顿

V1 建议改为 `MatrixSessionTile`：

- 只读 activity preview
- 最近消息摘要
- thinking / waiting / requests 状态
- token / runtime 摘要
- 点击进入完整 session

## 5. V1 acceptance criteria

### AC-1 Mode switch

- 团队页可在 `standard` 和 `matrix` 间切换
- `standard` 仍保留原四 tab
- 切换后刷新页面仍保留上次模式

### AC-2 Stable ordering

- meta agents 始终位于矩阵前部
- 其他 agent 顺序稳定
- 新消息到达不会打乱非 meta 顺序

### AC-3 Recommended grid

- agent 数变化时能给出推荐布局
- 用户可手动改布局
- 可一键回到 `Recommended`

### AC-4 Task rail behavior

- 左侧 rail 可展开/收起
- 正在执行中的任务会 dock 到 agent 顶部
- rail 不重复显示已被 active execution 占用的任务

### AC-5 Drag-to-assign

- web 端支持拖拽 task 到 agent tile
- drop 后：
  - task assignee 更新
  - 发送带 `mentions` 的 team message
  - tile 出现 docked task

### AC-6 Session preview

- 每个 tile 至少展示：
  - 状态
  - role
  - runtime
  - active task
  - 最近活动摘要
- 点击 tile 可进入完整 session

### AC-7 Mobile fallback

- 窄屏不强行展示大矩阵
- mobile 下至少支持：
  - 2 列或单列 preview
  - task rail 收起为 drawer / sheet

## 6. Non-goals for V1

- 不做多 team 同屏 matrix wall
- 不做 tile 内直接回复消息
- 不做 task drag 后自动创建 execution link 推断链路
- 不做 session tile 自由拖拽换位
- 不做按 usage / activity 自动重排

## 7. Recommended implementation shape

### 7.1 Route state

团队页状态拆成两层：

- `displayMode = standard | matrix`
- `standardTab = chat | board | info | evolution`

建议：

- `matrix` 不再作为 `standardTab` 的一个分支
- 路由参数可改为：
  - `mode=standard|matrix`
  - `tab=chat|board|info|evolution`

### 7.2 Components

建议拆分：

- `TeamDisplayModeSwitch`
- `MatrixToolbar`
- `TaskRail`
- `MatrixSessionTile`
- `DockedTaskChip`
- `useMatrixLayoutRecommendation`
- `useMatrixRosterOrdering`

### 7.3 Data selectors

建议新增 selector / util，而不是把逻辑都塞进页面文件：

- `getRecommendedGrid(agentCount, viewport)`
- `sortMatrixRoster(entries)`
- `getDockedTasks(tasks, sessionId)`
- `getRailTasks(tasks)`
- `buildTaskAssignmentMessage(task, agent)`

## 8. File-level task breakdown

### R layer

- `R-101` 定义“团队工作区双模式”产品语义
- `R-102` 定义 V1 / V2 边界
- `R-103` 定义 drag-to-assign 的真实业务语义：`assign + mention`

### D layer

- `D-101` 设计团队页路由状态：`mode` 与 `tab`
- `D-102` 设计 matrix tile 的只读 preview data contract
- `D-103` 设计 task rail vs docked task 的归属规则
- `D-104` 设计稳定排序规则和推荐布局规则
- `D-105` 设计 task 派发消息 contract

### F layer

- `F-101` 重构 `sources/app/(app)/teams/[id].tsx`
  - 把 `matrix` 从 tab 提升为 display mode
  - 加模式切换入口
  - 保持标准模式兼容
- `F-102` 升级 `sources/components/team/MatrixView.tsx`
  - toolbar
  - rail
  - docked task
  - preview tile
- `F-103` 新增 `sources/components/team/MatrixSessionTile.tsx`
- `F-104` 新增 `sources/components/team/TaskRail.tsx`
- `F-105` 新增 `sources/utils/teamMatrix.ts`
  - 推荐布局
  - 稳定排序
  - rail/docked selector
- `F-106` 改造 task assignment
  - 当前只改 `assigneeId`
  - 增加 team message + mentions
- `F-107` 增加模式记忆
- `F-108` 增加 matrix 相关测试

### U layer

- `U-101` 右上角控制条
- `U-102` tile 内 session preview
- `U-103` task dock 动效与视觉层级
- `U-104` 窄屏降级布局
- `U-105` 交互验收截图与走查

## 9. Execution batches

### Batch 1: 架构重构

目标：先把“matrix 是一种模式”立住

- `R-101`
- `D-101`
- `F-101`
- `F-107`

交付后应具备：

- 团队页可切 `standard / matrix`
- 标准模式不回归
- 页面刷新后模式可恢复

### Batch 2: Matrix wall 核心体验

目标：让 matrix 从 demo 卡片变成 command wall

- `D-102`
- `D-103`
- `D-104`
- `F-102`
- `F-103`
- `F-104`
- `F-105`
- `U-101`
- `U-102`

交付后应具备：

- 推荐布局
- 稳定排序
- 左 rail
- docked task
- session preview tile

### Batch 3: 派工闭环

目标：让拖拽变成真实派工动作

- `R-103`
- `D-105`
- `F-106`
- `U-103`

交付后应具备：

- drag/drop 后真正发出 `@agent` 派工消息
- UI 立即体现任务归属变化

### Batch 4: 收尾与验证

目标：把桌面体验打磨完整，移动端不崩

- `U-104`
- `F-108`
- `U-105`

## 10. Risks and mitigations

### Risk 1: Full session embed too heavy

Mitigation:

- V1 只做 preview tile
- 完整 session 仍通过点击进入

### Risk 2: Drag and drop cross-platform inconsistent

Mitigation:

- web 优先做原生 drag/drop
- mobile 使用长按选中 + 点按目标 agent 的降级方案

### Risk 3: Task rail 和 tile 重复展示

Mitigation:

- 建立单一归属规则：
  - active execution -> docked
  - otherwise -> rail

### Risk 4: 排序被后续需求打乱

Mitigation:

- 抽统一排序 util
- 写测试锁死 “meta first, others stable”

## 11. Mermaid DAG

```mermaid
flowchart TD
    R101[R-101 定义双模式工作区]
    R102[R-102 定义 V1/V2 边界]
    R103[R-103 定义派工语义 assign + mention]

    D101[D-101 路由状态: mode + tab]
    D102[D-102 Matrix tile preview contract]
    D103[D-103 Rail / Dock 归属规则]
    D104[D-104 推荐布局与稳定排序]
    D105[D-105 派工消息 contract]

    F101[F-101 重构 teams/[id].tsx]
    F102[F-102 升级 MatrixView]
    F103[F-103 新增 MatrixSessionTile]
    F104[F-104 新增 TaskRail]
    F105[F-105 新增 teamMatrix util]
    F106[F-106 drop -> assign + mention]
    F107[F-107 模式记忆]
    F108[F-108 测试与回归]

    U101[U-101 Toolbar 与模式切换 UI]
    U102[U-102 Session preview UI]
    U103[U-103 Docked task 视觉层级]
    U104[U-104 Mobile fallback]
    U105[U-105 截图走查与验收]

    R101 --> D101
    R102 --> D102
    R102 --> D103
    R102 --> D104
    R103 --> D105

    D101 --> F101
    D101 --> F107
    D102 --> F102
    D102 --> F103
    D103 --> F102
    D103 --> F104
    D104 --> F105
    D105 --> F106

    F101 --> U101
    F102 --> U101
    F102 --> U102
    F103 --> U102
    F104 --> U103
    F106 --> U103
    F102 --> U104
    F108 --> U105
```

## 12. Recommended next step

直接进入 Batch 1 + Batch 2。

原因：

- 当前代码已有 `MatrixView` 原型，适合在现有基础上升级
- 最先需要验证的是“模式切换 + command wall 是否成立”
- 派工消息闭环可以在 Batch 3 接上，不必一开始把所有链路都绑死

如果要开工，建议先从 `sources/app/(app)/teams/[id].tsx` 和 `sources/components/team/MatrixView.tsx` 开始。
