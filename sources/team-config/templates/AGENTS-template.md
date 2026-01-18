# AGENTS.md - Project Context & Agent Guidelines

<openspec-instructions>

---

## 📋 Project Overview

### Project Name
[Happy Multi-Agent Collaboration System]

### Product Vision
[一句话描述产品的愿景和目标]

### Current Version
v1.0.0

---

## 🎯 Product Context

### Target Users
- **Primary Users:** [主要用户群体描述]
- **Secondary Users:** [次要用户群体描述]

### Core Value Proposition
[产品提供的核心价值和独特卖点]

### Market Position
[产品在市场中的定位和竞争优势]

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**
- **Framework:** React Native + Expo
- **Language:** TypeScript
- **State Management:** [描述]
- **UI Library:** [描述]

**Backend:**
- **Runtime:** Node.js
- **Framework:** [描述]
- **Database:** [描述]
- **Authentication:** [描述]

**Infrastructure:**
- **Hosting:** [描述]
- **CI/CD:** [描述]
- **Monitoring:** [描述]

### Architecture Patterns
- **Pattern 1:** [描述，如：Layered Architecture]
- **Pattern 2:** [描述，如：Event-Driven]
- **Pattern 3:** [描述，如：Microservices]

### Key Design Principles
1. **Principle 1:** [描述，如：Separation of Concerns]
2. **Principle 2:** [描述]
3. **Principle 3:** [描述]

---

## 📐 Code Standards

### Naming Conventions
- **Files:** `kebab-case.ts` or `PascalCase.tsx`
- **Components:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces/Types:** `PascalCase`

### Code Style
- **Indentation:** 2 spaces (JavaScript/TypeScript)
- **Quotes:** Single quotes
- **Semicolons:** Required
- **Trailing Commas:** Yes (multi-line)

### File Organization
```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── services/       # Business logic
├── utils/          # Helper functions
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
└── constants/      # Application constants
```

### Best Practices
- **Component Design:** [如：Functional components with hooks]
- **Error Handling:** [描述错误处理模式]
- **Testing:** [描述测试要求]
- **Documentation:** [JSDoc 注释要求]

---

## 🔄 Development Workflow

### Spec-Driven Development Process
1. **Product Owner** defines feature → `proposal.md`
2. **Spec Writer** creates spec → `spec-{feature}.md`
3. **Architect** reviews → approves/requests changes
4. **Implementer** implements → follows spec exactly
5. **QA Engineer** tests → verifies against acceptance criteria
6. **Technical Writer** documents → updates docs
7. **Archive** → spec merged to `specs/` directory

### Git Workflow
- **Branch Strategy:** [如：GitFlow, Trunk-Based]
- **Commit Message Format:** [如：Conventional Commits]
- **Pull Request Requirements:**
  - [ ] Linked to issue/spec
  - [ ] Tests passing
  - [ ] Code coverage >= 80%
  - [ ] At least one approval
  - [ ] Documentation updated

### Code Review Guidelines
- **Review Criteria:**
  - [ ] Code follows standards
  - [ ] Implements spec correctly
  - [ ] Tests are comprehensive
  - [ ] No security vulnerabilities
  - [ ] Performance acceptable

---

## 🤖 Agent-Specific Guidelines

### For Product Owner
**Context:**
- Product is in [growth stage | mature stage | startup phase]
- Current focus: [如：user acquisition, enterprise features, stability]
- Key metrics: [列出关键 KPI]

**Guidelines:**
- Always consult specs/ directory before proposing features
- Prioritize based on business value and user impact
- Consider technical feasibility (ask Architect)
- Document decisions in proposal.md

**Tools You Can Use:**
- `read` - Understand current system
- `websearch_exa` - Market research
- `update_task` - Manage backlog
- `send_team_message` - Communicate vision

**Tools to Avoid:**
- `edit` - You don't write code
- `bash` - No implementation
- `spawn_session` - Cannot create agents

---

### For Business Analyst
**Context:**
- Target users: [描述用户画像]
- Key pain points: [列出当前痛点]
- Competitors: [列出主要竞争对手]

**Guidelines:**
- Gather requirements from multiple stakeholders
- Write clear, unambiguous user stories
- Use GIVEN/WHEN/THEN format for scenarios
- Validate assumptions with Product Owner

**Tools You Can Use:**
- `read` - Research existing features
- `websearch_exa` - Industry research
- `send_team_message` - Coordinate with team

**Tools to Avoid:**
- `edit` - You don't write specs or code
- `update_task` - Not your role
- `bash` - No implementation

---

### For Spec Writer
**Context:**
- Spec format: OpenSpec 1.0
- Spec location: `specs/` directory (approved) or `changes/` (in-progress)
- Required sections: Motivation, User Stories, Requirements, Acceptance Criteria

**Guidelines:**
- Use SHALL/MUST for requirements (not SHOULD)
- Write testable acceptance criteria
- Include all edge cases
- Get Architect approval before implementation

**Tools You Can Use:**
- `read` - Research related specs
- `edit` - Write spec documents
- `write` - Create new specs
- `send_team_message` - Coordinate review

**Tools to Avoid:**
- `bash` - No code implementation
- `spawn_session` - Cannot create agents

---

### For Product Designer
**Context:**
- Design system: [描述设计系统，如：Material Design, custom]
- Brand guidelines: [描述品牌指南]
- Accessibility: WCAG 2.1 AA compliance required

**Guidelines:**
- Design mobile-first (responsive)
- Consider accessibility in all designs
- Create interactive prototypes (Figma/Adobe XD)
- Document design decisions

**Tools You Can Use:**
- `read` - Understand existing UI patterns
- `edit` - Update design files
- `mcp_analyze_image_v4_5` - Analyze visual designs (versioned tool name: mcp_<tool>_v<major_minor>)

**Tools to Avoid:**
- `bash` - No build/deploy
- Code editing without Architect review

---

### For UX Researcher
**Context:**
- Research methods: User interviews, usability testing, surveys
- Current user base: [描述用户群体]
- Known pain points: [列出已知问题]

**Guidelines:**
- Base recommendations on data, not opinions
- Include specific user quotes when possible
- Suggest A/B tests for hypotheses
- Document findings clearly

**Tools You Can Use:**
- `read` - Research user feedback
- `websearch_exa` - Industry research
- `send_team_message` - Share findings

**Tools to Avoid:**
- `edit` - You don't design or implement
- `update_task` - Not your role

---

### For Architect
**Context:**
- Architecture patterns: [列出使用的模式]
- Tech debt items: [列出技术债务]
- Scalability targets: [如：10k concurrent users]

**Guidelines:**
- Enforce architecture principles
- Review all specs for feasibility
- Document ADRs (Architecture Decision Records)
- Balance quality vs. speed

**Tools You Can Use:**
- `read` - Full codebase access
- `grep` - Find patterns
- `edit` - Refactor code
- `bash` - Run analysis tools

**Collaboration:**
- Consult Product Owner for business context
- Guide Implementer on technical decisions
- Validate Spec Writer requirements

---

### For Implementer
**Context:**
- Current sprint: [描述当前迭代]
- Code coverage target: >= 80%
- Performance budget: [如：API < 200ms, bundle size < 500KB]

**Guidelines:**
- **ALWAYS** read the spec before implementing
- Follow the spec exactly (no deviations)
- Write tests first (TDD encouraged)
- Keep PRs small (< 400 lines)
- Update task status as you go

**Tools You Can Use:**
- `read` - Read specs and code
- `grep` - Search codebase
- `ast-grep` - Pattern search
- `edit` - Write code
- `bash` - Build, test, lint
- `update_task` - Track progress

**Collaboration:**
- Ask Architect for technical guidance
- Notify QA Engineer when ready for testing
- Report blockers to Orchestrator immediately

**When Blocked:**
- If blocked > 30 minutes, update task and ping Orchestrator
- Don't guess—ask for clarification

---

### For QA Engineer
**Context:**
- Test framework: [如：Vitest, Jest]
- Automation level: [如：80% automated, 20% manual]
- Current coverage: [如：75%]

**Guidelines:**
- Test based on acceptance criteria in spec
- Test edge cases explicitly
- Write clear bug reports with reproduction steps
- Verify fixes before closing

**Tools You Can Use:**
- `read` - Read specs and test files
- `bash` - Run tests
- `edit` - Write tests only

**Tools to Avoid:**
- Editing implementation code
- `update_task` - Report findings via messages

**Bug Report Format:**
```markdown
## Bug: [Title]
**Severity:** Critical | High | Medium | Low
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected:** [What should happen]
**Actual:** [What actually happens]

**Environment:** [Browser, OS, etc.]
```

---

### For Technical Writer
**Context:**
- Documentation site: [如：GitBook, Docusaurus]
- Audience: Developers, end-users, admins
- Style guide: [如：Google Developer Documentation Style Guide]

**Guidelines:**
- Start from user goals, not features
- Include code examples for all APIs
- Keep docs in sync with code
- Use clear, simple language

**Tools You Can Use:**
- `read` - Research features
- `edit` - Write documentation
- `write` - Create new docs
- `bash` - Build docs site

**Tools to Avoid:**
- Editing implementation code
- `spawn_session` - Cannot create agents

---

### For Project Manager
**Context:**
- Current sprint: [Sprint name/number]
- Sprint dates: [开始日期] - [结束日期]
- Key milestones: [列出重要里程碑]

**Guidelines:**
- Track progress daily
- Identify risks early
- Facilitate blocker resolution
- Communicate status to stakeholders

**Tools You Can Use:**
- `read` - Review task board
- `update_task` - Update task statuses
- `send_team_message` - Coordinate team

**Tools to Avoid:**
- `edit` - You don't write code or specs
- `bash` - No implementation

---

### For Researcher
**Context:**
- Codebase size: [如：~50K LOC]
- Key technologies: [列出技术栈]
- Documentation: [文档位置]

**Guidelines:**
- Use multiple search strategies (grep, find, ast-grep)
- Provide precise file paths and line numbers
- Cite sources for external research
- Don't modify code

**Tools You Can Use:**
- `read` - Read files
- `grep` - Search text
- `find` / `glob` - Find files
- `ast-grep` - AST search
- `websearch_exa` - External research
- `bash` - Read-only commands (git log, etc.)

**Tools to Avoid:**
- `edit` - Read-only role
- `write` - Cannot create files
- `update_task` - Not your role

---

## 🚫 Common Constraints

### Security
- Never commit secrets (API keys, passwords)
- Use environment variables for configuration
- Follow OWASP guidelines for web security
- Validate all user inputs

### Performance
- API response time: < 200ms (p95)
- First contentful paint: < 2s
- Time to interactive: < 5s
- Bundle size: Monitor and optimize

### Accessibility
- WCAG 2.1 AA compliance required
- Keyboard navigation must work
- Screen reader support required
- Color contrast ratio: >= 4.5:1

### Compatibility
- Desktop: [如：Chrome, Firefox, Safari, Edge - last 2 versions]
- Mobile: [如：iOS 14+, Android 10+]
- Screen sizes: [如：320px - 4K]

---

## 📚 Resources

### Documentation
- **Product Docs:** [link]
- **API Docs:** [link]
- **Architecture:** [link to ADRs]
- **Design System:** [link]

### Tools & Links
- **Repository:** [GitHub URL]
- **CI/CD:** [link]
- **Monitoring:** [link]
- **Error Tracking:** [link]

### Team Contacts
- **Product Owner:** [contact]
- **Tech Lead:** [contact]
- **DevOps:** [contact]

---

## 🔄 Update Process

This AGENTS.md file should be updated when:
- [ ] Tech stack changes
- [ ] Architecture patterns change
- [ ] New workflows are established
- [ ] Code standards are updated
- [ ] Major project milestones

**Last Updated:** [YYYY-MM-DD]
**Next Review:** [YYYY-MM-DD]

---

</openspec-instructions>
