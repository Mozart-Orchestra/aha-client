<div align="center"><img src="/logo.png" width="200" title="aha" alt="aha"/></div>

<h1 align="center">
  Mobile and Web Client for Claude Code & Codex
</h1>

<h4 align="center">
Use Claude Code or Codex from anywhere with end-to-end encryption.
</h4>

<div align="center">

[📱 **iOS App**](https://apps.apple.com/us/app/aha-claude-code-client/id6748571505) • [🤖 **Android App**](https://play.google.com/store/apps/details?id=com.ex3ndr.aha) • [🌐 **Web App**](https://app.aha.engineering) • [🎥 **See a Demo**](https://youtu.be/GCS0OG9QMSE) • [⭐ **Star on GitHub**](https://github.com/slopus/aha) • [📚 **Documentation**](https://aha.engineering/docs/)

</div>

<img width="5178" height="2364" alt="github" src="https://github.com/user-attachments/assets/14d517e9-71a8-4fcb-98ae-9ebf9f7c149f" />


<h3 align="center">
Step 1: Download App
</h3>

<div align="center">
<a href="https://apps.apple.com/us/app/aha-claude-code-client/id6748571505"><img width="135" height="39" alt="appstore" src="https://github.com/user-attachments/assets/45e31a11-cf6b-40a2-a083-6dc8d1f01291" /></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://play.google.com/store/apps/details?id=com.ex3ndr.aha"><img width="135" height="39" alt="googleplay" src="https://github.com/user-attachments/assets/acbba639-858f-4c74-85c7-92a4096efbf5" /></a>
</div>

<h3 align="center">
Step 2: Install CLI on your computer
</h3>

```bash
npm install -g aha-coder
```

<h3 align="center">
Step 3: Start using `aha` instead of `claude` or `codex`
</h3>

```bash

# Instead of: claude
# Use: aha

aha

# Instead of: codex
# Use: aha codex

aha codex

```

## How does it work?

On your computer, run `aha` instead of `claude` or `aha codex` instead of `codex` to start your AI through our wrapper. When you want to control your coding agent from your phone, it restarts the session in remote mode. To switch back to your computer, just press any key on your keyboard.

## 🔥 Why aha?

- 📱 **Mobile access to Claude Code and Codex** - Check what your AI is building while away from your desk
- 🔔 **Push notifications** - Get alerted when Claude Code and Codex needs permission or encounters errors  
- ⚡ **Switch devices instantly** - Take control from phone or desktop with one keypress
- 🔐 **End-to-end encrypted** - Your code never leaves your devices unencrypted
- 🛠️ **Open source** - Audit the code yourself. No telemetry, no tracking

## 📦 Project Components

- **[aha-cli](https://github.com/slopus/aha-cli)** - Command-line interface for Claude Code and Codex
- **[aha-server](https://github.com/slopus/aha-server)** - Backend server for encrypted sync
- **aha-coder** - This mobile client (you are here)

## 🤝 多智能体团队协作

aha 支持生成多个具有专门角色的 AI 智能体，协同完成复杂任务：

| 角色 | 描述 |
|------|------|
| Master/Orchestrator | 规划和分配工作，协调团队 |
| Architect | 做技术决策，审查架构 |
| Implementer | 实现功能，负责代码执行 |
| QA-Engineer | 测试功能，验证质量 |
| Researcher | 探索代码库，收集信息 |
| Observer | 审计进度，审查交付物 |

智能体通过共享的看板和团队聊天进行沟通，基于角色的工具限制确保职责分离。

**[查看团队协作架构文档](docs/TEAM_COLLABORATION_ARCHITECTURE.md)**

## ⭐ 角色与评分系统

Aha Kanban 提供完整的角色与评分系统（大众点评风格）：

### 角色管理

- **角色选择器** - 支持多种视图聚合展示：
  - All（全量视图）
  - My（我的角色）
  - Pool（公共角色池）
  - Defaults（默认模板）
- **搜索过滤** - 按名称/描述搜索角色
- **自定义角色 CRUD** - 创建、编辑、删除自定义角色
- **角色导入/导出** - 跨团队分享角色模板

### 评分功能

- **角色评分显示** - Team 详情页显示评分、来源分项、代码/质量累计
- **团队评分显示** - Team 详情页显示团队评分总览与来源分布
- **用户评分功能** - 支持提交角色/团队评分与评论
- **评分排行榜** - 支持时间窗口筛选（7d/30d/all）与分类筛选
- **系统自动评分** - 基于代码行数、提交数、Bug数等指标自动计算

### 评分来源

系统支持三种评分来源：
- **user** - 用户提交评分
- **master** - Master/Lead 评分
- **system** - 基于指标的自动化系统评分

**[查看角色与评分迭代文档](../DOC/v1-v2-role-rating-iteration-2026-02-27.md)**

### V2 核心功能（2026-02-27）

V2 版本在 V1 基础上完成了完整的角色与评分系统：

- **角色系统**：22 个默认角色模板 + 自定义角色 CRUD + 公共角色池
- **评分系统**：三种评分来源（用户/导师/系统）+ CLI 命令 + Kanban 展示
- **API 兼容性**：V1/V2 双版本运行，自动降级机制

**[查看 V2 迭代文档](../DOC/v1-v2-closed-loop-iteration-2026-02-27.md)**

### V3 测试与优化（2026-02-28）

- **自动化测试**：Server API 测试 (87.06%) + CLI 测试 + E2E 测试
- **性能优化**：p95 响应时间 < 6ms（缓存机制）
- **错误处理**：统一错误码 + 前端优化展示
- **用户洞察**：36 个痛点 + 45 个机会点

**[查看 V3 架构文档](../DOC/v3-opt-architecture-implementation-plan-2026-02-28.md)**

### V4 体验增强（2026-02-28）

- **评分完成 Toast 通知** - 任务完成后展示评分结果，支持 5 秒自动消失与手动关闭
- **评分仪表盘 + 雷达图** - 用多维雷达图展示团队/角色评分，并显示团队平均分对比
- **"我的排名"高亮与趋势** - 在排行榜中高亮当前用户并展示排名变化（🔺/🔻/➡️）
- **角色统计卡片** - 聚合平均分、完成任务数、成功率等关键指标
- **角色对比与多维度评分** - 支持角色对比分析与目标化评分改进

**[查看 V4 迭代文档](./V4_CHANGELOG.md)**

## 🏠 Who We Are

We're engineers scattered across Bay Area coffee shops and hacker houses, constantly checking how our AI coding agents are progressing on our pet projects during lunch breaks. aha was born from the frustration of not being able to peek at our AI coding tools building our side hustles while we're away from our keyboards. We believe the best tools come from scratching your own itch and sharing with the community.

## 📚 Documentation & Contributing

### 部署说明

| 版本 | 端口 | 状态 | 说明 |
|------|------|------|------|
| V1 | 3005 | ✅ 运行中 | 基础 Kanban 功能 |
| V2 | 3006 | ✅ 运行中 | 角色与评分系统 |
| V3 | - | 🚧 开发中 | 测试与性能优化 |

- **V1 (port 3005)**: 基础 Kanban 功能
- **V2 (port 3006)**: 角色与评分系统（V1 兼容）

V1/V2 API 兼容：客户端请求 V2 API 失败时自动降级到 V1 API。

- **[Documentation Website](https://aha.engineering/docs/)** - Learn how to use aha effectively
- **[Edit docs at github.com/slopus/slopus.github.io](https://github.com/slopus/slopus.github.io)** - Help improve our documentation and guides

## License

MIT License - see [LICENSE](LICENSE) for details.
