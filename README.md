<div align="center"><img src="/logo.png" width="200" title="Aha" alt="Aha"/></div>

<h1 align="center">
  Mobile and Web Client for Claude Code & Codex
</h1>

<h4 align="center">
Use Claude Code or Codex from anywhere with end-to-end encryption.
</h4>

<div align="center">
  
[🌐 **Web App**](https://aha-agi.com/webappv3) • [⭐ **Star on GitHub**](https://github.com/Shiyao-Huang/happy) • [📚 **CLI**](https://github.com/Shiyao-Huang/happy-cli) • [🧬 **Genome Hub**](https://github.com/Shiyao-Huang/genome-hub)

</div>

<img width="5178" height="2364" alt="github" src="https://github.com/user-attachments/assets/14d517e9-71a8-4fcb-98ae-9ebf9f7c149f" />


<h3 align="center">
Step 1: Open the Aha Web App
</h3>

Visit **https://aha-agi.com/webappv3** from your browser or mobile device.

<h3 align="center">
Step 2: Install CLI on your computer
</h3>

```bash
npm install -g aha-agi
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

## 🔥 Why Aha?

- 📱 **Mobile access to Claude Code and Codex** - Check what your AI is building while away from your desk
- 🔔 **Push notifications** - Get alerted when Claude Code and Codex needs permission or encounters errors  
- ⚡ **Switch devices instantly** - Take control from phone or desktop with one keypress
- 🔐 **End-to-end encrypted** - Your code never leaves your devices unencrypted
- 🛠️ **Open source** - Audit the code yourself. Optional anonymous product analytics only; your content stays encrypted

## 📦 Project Components

- **[happy-cli](https://github.com/Shiyao-Huang/happy-cli)** - Command-line interface for Claude Code and Codex
- **[happy-server](https://github.com/Shiyao-Huang/happy-server)** - Backend server for encrypted sync
- **[genome-hub](https://github.com/Shiyao-Huang/genome-hub)** - Agent genome registry and evolution service
- **[happy](https://github.com/Shiyao-Huang/happy)** - Mobile and web client (you are here)

## 🤝 多智能体团队协作

Aha 支持生成多个具有专门角色的 AI 智能体，协同完成复杂任务：

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

## 🏠 Who We Are

We are the Aha community: builders, researchers, and agent-platform users who want AI coding systems that are open, inspectable, and respectful of user-owned compute. This repository is independently maintained under `Shiyao-Huang/happy`; we keep license and provenance notices intact while evolving our own multi-agent, genome, and team-collaboration roadmap.

## 📚 Documentation & Contributing

- **[GitHub Issues](https://github.com/Shiyao-Huang/happy/issues/new/choose)** - Report bugs or request improvements
- **[Aha CLI](https://github.com/Shiyao-Huang/happy-cli)** - Install and run the local daemon

## License

MIT License - see [LICENSE](LICENSE) for details.
