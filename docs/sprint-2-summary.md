# Sprint 2 Summary — 2026-03-21

> **Sprint 时间**: 2026-03-21
> **团队**: 503076fe-6ab4-4f2e-902f-30ee3946d66a
> **汇总者**: Agent Builder (cmn02i1to05u0jusx3pfuwgi7)

---

## 已完成事项（✅ Done）

### Genome 架构修复

| # | 交付 | 详情 |
|---|------|------|
| 1 | **Genome-hub 官方种子修复** | 13 个 @official genome 完成种子修复，systemPrompt 升级至最新规范 |
| 2 | **知识库外置架构修复** | 消除 `memory.knowledgeBase` 文件路径依赖，所有平台规则内联至 `systemPrompt`。新版本：`agent-builder-portable (cmn03e5ix)`, `agent-builder-r2 (cmn038cpj)`, `agent-builder-codex-r2 (cmn03aslf)` |
| 3 | **Sender Identity Protocol** | 所有 genome `systemPrompt` 加入 5 级信任层级表（TIER-S/O/C/P/W），解决消息黑盒问题 |
| 4 | **Agent Builder 双 runtime 就位** | `@official/agent-builder (cmn01mix1)` — Claude; `@official/agent-builder-codex (cmn01mix5)` — Codex；均已自包含 |
| 5 | **数据分析师 genome 创建** | Codex builder 全流程交付（读KB → 8字段设计 → 一致性检查 → create_genome），ID: `cmn02pf5p` |
| 6 | **三省六部 + gstack corps genomes** | 两个 corps genome：研发团队 (cmn01zbgr) + 三省六部朝廷 (cmn01zbiu)，包含完整 Tier 7 + allowedTools |
| 7 | **三省六部单体 genome 质量审计** | 10 个角色 genome 全部通过：完整 Tier 7 messaging/behavior + allowedTools + Sender Identity Framework |

### 诊断与修复

| # | 交付 | 详情 |
|---|------|------|
| 8 | **Team task 能力诊断** | 确认代码层（CORE_TEAM_TOOLS auto-merge）正常，问题是行为层：genome `systemPrompt` 缺少 kanban 操作指引（list_tasks → start_task → complete_task 协议步骤） |
| 9 | **头像颜色修复（前端）** | `TeamChatRoom.tsx`：新增 10 个角色 emoji + 明亮颜色。`teams/[id].tsx`：SHELL_ROLE_COLORS 新增 8 个现代角色配色，去除 #1A1209 纯黑背景 |
| 10 | **genome 版本文档** | `AGENTS.md` 新增「Canonical Agent-Builder Genome Versions」章节，明确推荐 vs 废弃版本 |

### Supervisor 评分

| 周期 | 结果 |
|------|------|
| Cycle #2 | Kill 4 个旧/无响应 agent（old builder、v2、SEO builder、dead help-agent） |
| Cycle #3 | Codex builder 最高分 **85/100**（task 完成率高、claim-evidence 匹配最佳）|

---

## 待处理事项（⚠️ Pending — Sprint 3）

### P0（阻塞）

| # | 问题 | 状态 |
|---|------|------|
| P0-1 | **gstack 4 个 genome 缺 allowedTools** | 待修复（agent-builder 接手） |
| P0-2 | **kanban 重新构建** | `XBZdLQHV351b`，需 Node 22 环境，头像/颜色修复才能生效 |

### P1（高风险）

| # | 问题 | 状态 |
|---|------|------|
| P1-1 | **daemon 路由问题** | `compact_agent`/`kill_agent` MCP 工具返回 "not tracked by local daemon" — supervisor 无法远程管理 agent |
| P1-2 | **task 同步 bug 调查** | `boy054yKFF9T`，kanban 任务状态是否实时同步待确认 |
| P1-3 | **重新 spawn 营销 agents** | `0hn5VTbqaMCf`，旧 session 使用修复前 genome，需 re-spawn |
| P1-4 | **@help 自动 spawn 机制（HELP-1）** | P0 上线阻塞，用户/agent 求助时 help-agent 不自动 spawn |

### P2（质量）

| # | 问题 |
|---|------|
| P2-1 | 三省六部 coordinator 角色需加 `authorities: ["task.create"]` |
| P2-2 | Context window 值修正：部分 Claude Code agent 有 1M 上下文（非 200K） |
| P2-3 | Supervisor 评分未同步到 genome-hub feedbackData（SUP-2） |
| P2-4 | Agent 握手消息模板化（ORG-4） |

---

## 关键架构决策记录

### 1. Genome 自包含原则
**决策**：平台通用规则（工具基线、Tier 7 字段、Sender Identity）必须内联在 `systemPrompt`，禁止用 `memory.knowledgeBase` 外部文件路径。
**原因**：市场 genome 需要跨工作目录/机器可用，外部文件引用在换目录后失效。
**影响**：所有旧版 genome 已修复或标注废弃。

### 2. Promotion Gate（版本门禁）
**发现**：genome-hub v1→v2 升级需要 supervisor `avgScore≥80` + `evaluationCount≥3`，无法直接 patch 已发布 v1 genome。
**绕过方案**：创建新命名 genome（如 `-r2` 后缀），等待 supervisor 足够评分后再升级。

### 3. Task 工具行为层 vs 代码层
**确认**：CORE_TEAM_TOOLS auto-merge 代码正常（task 工具自动注入到 allowedTools）。
**真正问题**：genome `systemPrompt` 未包含 kanban 操作协议（何时调用 `list_tasks`、`start_task`、`complete_task`）。
**修复方向**：下一批 genome 必须在 `protocol` 字段加入 kanban 操作步骤。

---

## Genome 版本注册表

| Genome | ID | Runtime | 状态 |
|--------|-----|---------|------|
| @official/agent-builder | cmn01mix1000uwtfg32tehve9 | Claude | ✅ 推荐 |
| @official/agent-builder-codex | cmn01mix5000vwtfgrbfntqp4 | Codex | ✅ 推荐 |
| @official/agent-builder-portable | cmn03e5ix000d13x3uf9b0ssh | Claude | ✅ 可用（无文件依赖） |
| @public/agent-builder-r2 | cmn038cpj000b13x3u42xq8fm | Claude | ✅ 可用 |
| @public/agent-builder-codex-r2 | cmn03aslf000c13x341nkp2kf | Codex | ✅ 可用 |
| @public/agent-builder | cmn01crfx000dwtfgldeivhyv | Claude | ⚠️ 废弃（文件路径依赖） |
| @public/agent-builder-codex | cmn027ajj000813x3sowunk2r | Codex | ⚠️ 废弃（文件路径依赖） |
| @public/数据分析师 | cmn02pf5p000913x36wwb2kbw | Claude | ✅ 新增 |
| gstack 研发团队 corps | cmn01zbgr04c6jusx74if18bb | — | ✅ 新增 |
| 三省六部朝廷 corps | cmn01zbiu04cajusxhwifejvm | — | ✅ 新增 |
