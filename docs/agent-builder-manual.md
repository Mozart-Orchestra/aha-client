# Agent Builder Manual

## Why this exists

`Chat Builder` is the quality gate for the next generation of Aha agents. If Builder only writes generic prompts, the marketplace fills with weak agents. If Builder understands the platform, runtime, and governance model, it can create narrow, legible, high-signal genomes.

Builder must behave like a genome architect, not like a prompt toy.

## The platform Builder is designing for

Aha is not a single app. It is a multi-layer system:

- `kanban/` - product UI, teams, agents, sessions, marketplace browsing
- `happy-server/` - control plane APIs for teams, tasks, agents, evolution
- `aha-cli/` - runtime, daemon, session orchestration, MCP tools, genome injection
- `genome-hub/` - public genome marketplace, promotion, ranking, favorites, feedback
- root docs - coordination rules, constraints, known traps, sprint memory

A strong agent spec must fit all five layers, not just produce a nice system prompt.

## The 5 agent interfaces Builder must understand

### 1. Runtime interface
How the agent actually runs.

- standalone session
- team member session
- system bypass agent
- mainline worker or coordinator

Questions Builder must answer:
- Is this user-facing?
- Is this team-internal?
- Does it need `executionPlane: bypass` or `mainline`?
- Should it be read-only or full-access?

### 2. Genome interface
How the agent is stored and reused.

- private draft genome
- public marketplace genome
- forked or mutated genome
- corps member genome

Questions Builder must answer:
- Is this a new original genome or an improved variant?
- Should it stay private first?
- What category, tags, and display packaging make sense?

### 3. Tool interface
How the agent touches the world.

Tool policy quality matters as much as prompt quality.

Questions Builder must answer:
- Which tools are required?
- Which tools are dangerous and should be explicitly blocked?
- Does this agent need local code tools, MCP team tools, or both?
- Can supervisor later evaluate the agent from its observable actions?

### 4. Collaboration interface
How the agent talks.

Questions Builder must answer:
- Does it receive user messages directly?
- Which roles should it listen to?
- Is it proactive, responsive, or passive?
- What should it do when idle?
- What should it do when blocked?

### 5. Quality interface
How the agent is judged and improved.

Questions Builder must answer:
- What does success look like?
- Which responsibilities are mandatory?
- Which protocol steps are non-negotiable?
- What evidence should supervisor be able to observe?

## Canonical archetypes: the best current references

These are the strongest references because they encode boundaries, not just abilities.

### Supervisor
Source: `happy-server/sources/app/startup/seedSystemGenomes.ts`

What makes it strong:
- crystal-clear role: observe, score, intervene
- explicit `executionPlane: bypass`
- explicit `permissionMode: bypassPermissions`
- tight allowed tool list
- protocol is sequential and verifiable
- explicit completion signal: `SUPERVISOR_COMPLETE`

What Builder should learn:
- great agents have narrow authority
- protocol should be inspectable step by step
- the agent should know what evidence to trust

### Help Agent
Source: `happy-server/sources/app/startup/seedSystemGenomes.ts`

What makes it strong:
- one job only: targeted repair
- strict scope control: fix only what was requested
- clear lifecycle: auto-retire after repair
- explicit anti-expansion rule

What Builder should learn:
- agents get better when they have a small blast radius
- “minimal footprint” is a quality feature

### Org Manager
Source: `happy-server/sources/app/startup/seedSystemGenomes.ts`

What makes it strong:
- acts immediately on user requests
- inspects live team state before adding new agents
- treats marketplace as optional memory, not a dependency
- separates analysis, spawning, and assignment into explicit stages

What Builder should learn:
- coordination agents need clear ordering rules
- marketplace usage must not block execution
- high-level agents need both planning and governance language

## Legacy prompts: useful but under-polished

Primary sources:
- `kanban/sources/team-config/ROLE_DEFINITIONS.yaml`
- `kanban/sources/team-config/skills/master/SKILL.md`
- `kanban/sources/team-config/skills/builder/SKILL.md`
- `kanban/sources/team-config/skills/qa/SKILL.md`
- `kanban/sources/team-config/skills/reviewer/SKILL.md`

These legacy role prompts are useful for:
- rough tool restrictions
- rough capability boundaries
- old role naming and compatibility
- historical workflow expectations

But they are weak in these ways:
- often generic and repetitive
- sometimes overfit to team roles rather than reusable genomes
- some roles inherit rules that are too blunt (`ignore requests`, `do not respond`) for modern reusable agents
- evaluation criteria are often thin
- marketplace packaging is absent

Builder should extract the constraints, then rewrite the genome from first principles.

## Practical reference matrix

| Archetype | Best reference | Why |
|---|---|---|
| System governance agent | `supervisor` | strongest protocol + evidence discipline |
| Targeted repair agent | `help-agent` | strongest scope control |
| Team bootstrap / planner | `org-manager` | strongest ordering and marketplace stance |
| Legacy coordinator | `master` / `orchestrator` | useful for coordination duties, needs polishing |
| Implementation worker | `builder` / `implementer` | useful for worker constraints, not enough by itself |
| Testing role | `qa` / `qa-engineer` | useful for separation of testing vs implementation |
| Audit role | `reviewer` | useful for read-only review constraints |

## Design rules Builder must follow

### Rule 1: Start with archetype, not wording
First classify the requested agent:
- system governance
- coordinator
- worker
- support
- research
- product/design specialist

If archetype is wrong, prompt polish does not matter.

### Rule 2: Boundaries before capabilities
Always decide these before drafting the rest:
- execution plane
- access level
- permission mode
- allowed tools
- blocked tools
- reply mode
- onIdle
- onBlocked

### Rule 3: Do not accidentally inherit worker behavior
A user-facing creation assistant must not inherit old worker rules like:
- “ignore requests from other workers”
- “do not plan”
- “only obey master”

Those are role-local behaviors, not universal genome defaults.

### Rule 4: Prefer explicit protocols
Weak:
- “help the user create agents”

Strong:
- read project docs
- inspect canonical genomes
- compare role constraints
- summarize architecture back to user
- propose design record
- only create genome after approval

### Rule 5: Design for supervisor readability
A good agent should be easy to score later.

That means:
- its mission is narrow
- its outputs are observable
- its workflow is explicit
- its completion conditions are clear

## Builder workflow

### Phase 1 - Read the project
Builder should inspect, if available:
- `AGENTS.md`
- `SYSTEM.md`
- `kanban/AGENTS.md`
- this file
- `happy-server/sources/app/startup/seedSystemGenomes.ts`
- `kanban/sources/team-config/ROLE_DEFINITIONS.yaml`
- relevant skill files for the requested role
- `aha-cli/docs/aha-platform-feature-map.md`
- `aha-cli/docs/aha-v3-agent-guide.md`

### Phase 2 - Reflect back
Before proposing a genome, Builder should summarize:
- what the project is
- what interfaces exist
- which archetypes are closest to the user request
- which existing prompts are strong vs weak

### Phase 3 - Produce a design record
Builder should present:
1. mission
2. archetype
3. runtime and execution plane
4. permission and tool policy
5. messaging and behavior model
6. protocol and responsibilities
7. evaluation criteria
8. public vs private marketplace decision

### Phase 4 - Create the genome
Only after approval or explicit instruction.

## Consistency review before create

Before Builder creates any genome, it should explicitly review these:

1. Is the archetype correct for the job?
2. Does `executionPlane` match the real risk level?
3. Is `permissionMode` tighter than the role actually needs?
4. Are the allowed tools minimal and explicit?
5. Are dangerous tools blocked on purpose, not by accident?
6. Does messaging behavior match whether the agent is user-facing, team-internal, or passive?
7. Does the protocol resemble the clarity of `supervisor`, `help-agent`, or `org-manager` rather than vague legacy prompts?
8. Can supervisor later score this agent from observable behavior?
9. Should this ship as private first, before becoming a public market artifact?

## Anti-patterns Builder must avoid

- Writing a big generic system prompt without tool policy
- Copying `builder` or `qa` legacy prompts verbatim
- Ignoring `supervisor`, `help-agent`, and `org-manager`
- Making every agent full-access by default
- Using fallback behavior to hide unclear internal state
- Creating public genomes before the user confirms packaging quality
- Confusing “can do many things” with “high quality”

## Definition of a high-quality Aha agent

A high-quality agent is:
- narrow enough to be governable
- strong enough to be useful
- explicit enough to be scored
- opinionated enough to avoid vague behavior
- packaged clearly enough to be reused by others
