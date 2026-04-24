# Agent QA 登记

- 日期：2026-04-20
- 仓库：kanban-0330-max-redefine-login
- 发现问题：`sources/trash/qr.spec.ts` 被移出功能目录后，仍然使用 `import RestoreQR from './qr'`，导致 Vitest 无法解析模块，测试直接失败。
- 复现命令：
  - `npx vitest run sources/components/team/teamChatRoomList.spec.ts sources/hooks/useTeamLifecyclePersist.spec.ts sources/utils/genomeHub.spec.ts sources/utils/sidebarAgentIdentity.spec.ts sources/trash/qr.spec.ts sources/utils/invertedListAnchor.spec.ts --reporter=dot`
- 失败现象：
  - `Cannot find module './qr' imported from 'sources/trash/qr.spec.ts'`
- 处理方案：
  - 将 QR 测试移回 `sources/app/(app)/restore/qr.spec.ts`，与被测组件同目录放置，恢复正确的相对导入关系，并符合“测试与功能代码相邻”的仓库约定。
- 迭代过程中追加发现：
  - `RestoreQR` 现在会调用 `auth.login(token, secret, invitationVerified ?? null)`，旧测试仍按双参数断言，导致回归测试继续失败。
- 代码修复：
  - 更新 `sources/app/(app)/restore/qr.spec.ts`，断言第三个参数为 `null`；
  - 新增 `invitationVerified=true` 透传断言，覆盖新的登录参数行为。
- 验证结果：
  - 已执行：
    - `npx vitest run 'sources/app/(app)/restore/qr.spec.ts' sources/components/team/teamChatRoomList.spec.ts sources/hooks/useTeamLifecyclePersist.spec.ts sources/utils/genomeHub.spec.ts sources/utils/sidebarAgentIdentity.spec.ts sources/utils/invertedListAnchor.spec.ts --reporter=dot`
  - 结果：`6 passed / 52 passed`
- 补充说明：`tsc_check` 在仓库级别执行时超时，未能在本轮完成全量类型验证；当前改动仅涉及测试文件，已通过对应回归测试确认行为。

- 日期：2026-04-20
- 仓库：kanban-0330-max-redefine-login
- 发现问题：`sources/auth/supabaseConfig.ts` 将真实 Supabase URL 与 anon key 默认值硬编码在源码中，未提供环境变量时会静默回退到生产凭据。
- 风险等级：严重（安全/配置漂移）
- 处理方案：
  - 移除源码中的生产默认值，改为强制从 `EXPO_PUBLIC_SUPABASE_URL` 与 `EXPO_PUBLIC_SUPABASE_ANON_KEY` 读取；
  - 缺失或非法时抛出明确错误，避免静默连接到真实项目；
  - 更新 `sources/auth/supabaseConfig.spec.ts`，覆盖缺失/空白/非法 key 的失败分支与显式 env 成功分支。
- 验证结果：
  - `npx vitest run sources/auth/supabaseConfig.spec.ts` ✅（7/7）
  - `yarn typecheck` ✅

- 日期：2026-04-20
- 仓库：kanban-0330-max-redefine-login
- 发现问题：前端在 agent/session 页面会反复触发无效资源请求：
  1. 编码后的 genome 引用（如 `%40official%2Fhelp-agent`）未被统一解码，导致 genome 查询链路容易把合法 ref 当成异常值处理；
  2. 已不存在的 session 仍持续请求 `/v1/sessions/:id/messages`，404 后继续走 backoff，浏览器控制台反复刷错。
- 风险等级：中等（噪音告警 / 无效重试 / 429 放大）
- 处理方案：
  - `sources/utils/genomeHub.ts`：统一对 lookup 值做 best-effort URL decode，让 `@official/help-agent` 一类 ref 即使经过路由编码也能正常识别；
  - `sources/sync/sync.ts`：`fetchMessages()` 在 session 404 时停止该 session 的消息同步并抛出 non-retryable，避免继续退避重试。

- 日期：2026-04-24
- 仓库：happyhere (kanban / happy-server / genome-hub / aha-cli)
- 发现问题：wow 服务器（aha-agi.com）进入稳定服务期，禁止直接更新或部署
- 风险等级：高（部署流程 / 环境隔离）
- 处理方案：
  - wow 服务器禁止直接更新代码或部署；所有变更必须先在 geminihub（ahaagi.com）验证，确认稳定后再同步到 wow
  - wow 仅作为稳定运行的测试环境使用
  - deploy.sh 双 schema 修复（genome-hub + happy-server sqlite→postgresql）已验证
- 验证结果：
  - happy-server 重启后健康：POST /v1/teams/:id/members → 400（路由正常），GET /v1/artifacts/:id → 401（路由正常），/api/health → 200 OK

- 日期：2026-04-24
- 仓库：happyhere (aha-cli / genome-hub)
- 发现问题：Codex boot loop 已修复，允许创建 Codex agents
- 风险等级：无（功能恢复）
- 处理方案：
  - Codex boot loop 根因已定位并修复
  - 移除"禁止 spawn Codex"限制
  - Codex agents 可正常创建并参与团队
- 验证结果：
  - Codex runtime 恢复正常
  - MCP 连接已修复
  - 心跳检测正常

- 日期：2026-04-24
- 仓库：happyhere (aha-cli)
- 发现问题：`create_agent` 幂等性缺失 — 返回错误但实际 spawn 成功，重试导致巨量重复 agent
- 风险等级：严重（资源失控 / spawn 风暴）
- 根因链路：
  - `createTeamMemberIdentity()` 每次调用生成全新 memberId（agentTools.ts:392）
  - daemon `/spawn-session` 无去重检查（sessionManager.ts:708）
  - HTTP 响应丢失（超时/网络）但 spawn 成功 → caller 看到 error → 重试 → 重复创建
  - codex spawn 60s 超时特别容易触发（Docker 容器启动慢）
- 附加问题：`HELP_POOL_MAX=2` 只覆盖自动 spawn 路径（helpAutoSpawn.ts），`create_agent` 路径无池检查
- 处理方案：
  - Fix 1: daemon `spawnSession` 加 `{teamId, role, parentSessionId}` 去重
  - Fix 2: `create_agent` 入口加 help-agent 池上限检查
  - Fix 3: 加 idempotency key，缓存最近 spawn 结果 60s
- 验证结果：
  - 实时确认：kill 后 1 分钟内第 4 个 help-agent 被 spawn 出来（幂等性 bug 活跃证据）
  - 任务 #task-iXJt01JLx3He 已创建并附完整诊断
