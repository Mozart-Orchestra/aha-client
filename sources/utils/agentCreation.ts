import type { GenomeSpec } from '@/utils/genomeHub';
import type { Genome } from '@/sync/apiEvolution';

export type ManualAgentCategory = 'coordination' | 'support' | 'execution';
export type ManualAgentRuntime = 'claude' | 'codex';
export type ManualPermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions';

export interface ManualAgentDraft {
    displayName: string;
    description: string;
    category: ManualAgentCategory;
    runtime: ManualAgentRuntime;
    roleId: string;
    systemPrompt: string;
    responsibilities: string;
    capabilities: string;
    tags: string;
    modelId: string;
    permissionMode: ManualPermissionMode;
    kanbanOwnTasks: boolean;
    kanbanBoardAuthority: boolean;
}

export interface ChatBuilderDraft {
    displayName: string;
    runtime: ManualAgentRuntime;
    brief: string;
}

type ManualDraftSyncPayload = Partial<{
    displayName: string;
    description: string;
    category: ManualAgentCategory;
    runtime: ManualAgentRuntime;
    roleId: string;
    systemPrompt: string;
    responsibilities: string | string[];
    capabilities: string | string[];
    tags: string | string[];
    modelId: string;
    permissionMode: ManualPermissionMode;
    kanbanOwnTasks: boolean;
    kanbanBoardAuthority: boolean;
}>;

const AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE = 'kanban/docs/agent-builder-knowledge-base.md';
export const PRIVATE_AGENT_BUILDER_VERSION = 3;
export const AGENT_CARD_SYNC_COMMENT_TOKEN = 'AHA_AGENT_CARD';

const AGENT_BUILDER_DEEP_REFERENCES = [
    'AGENTS.md',
    'SYSTEM.md',
    'kanban/AGENTS.md',
    'kanban/docs/agent-builder-manual.md',
    'docs/architecture/agent-evolution-system.md',
    'docs/architecture/standalone-agent-design.md',
    'happy-server/sources/app/startup/seedSystemGenomes.ts',
    'kanban/sources/team-config/ROLE_DEFINITIONS.yaml',
    'kanban/sources/team-config/skills/master/SKILL.md',
    'kanban/sources/team-config/skills/builder/SKILL.md',
    'kanban/sources/team-config/skills/qa/SKILL.md',
    'kanban/sources/team-config/skills/reviewer/SKILL.md',
    'aha-cli/docs/aha-platform-feature-map.md',
    'aha-cli/docs/aha-v3-agent-guide.md',
    'aha-cli/docs/launch-genome-architecture-2026-03-18.md',
    'aha-cli/docs/launch-agent-workspace-marketplace-contract-2026-03-18.md',
];

function splitListInput(value: string): string[] {
    return value
        .split(/\n|,/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function normalizeListInput(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        const items = value.map((item) => String(item).trim()).filter(Boolean);
        return items.length > 0 ? items.join('\n') : '';
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return undefined;
}

function normalizeEnumValue<T extends string>(
    value: unknown,
    allowed: readonly T[],
): T | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    return allowed.includes(value as T) ? value as T : undefined;
}

function normalizeBooleanValue(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function normalizeStringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim() : undefined;
}

function buildKanbanCapabilityDefinition(options: {
    ownTasks: boolean;
    boardAuthority: boolean;
}) {
    const ownTasks = options.ownTasks || options.boardAuthority;
    const boardAuthority = options.boardAuthority;

    const responsibilities = [
        'Treat the Kanban board as the source of truth for team work state',
        'Always read team state from get_team_info and list_tasks before inferring work from chat or files',
    ];

    const protocol = [
        'Kanban visibility is always on: check get_team_info and list_tasks before starting work',
    ];

    const capabilities = ['kanban-visibility'];
    const disallowedTools: string[] = [];

    if (ownTasks) {
        responsibilities.push('Own assigned tasks visibly on the board instead of working only in chat');
        protocol.push('When assigned work, use start_task -> complete_task, and use report_blocker if stuck');
        capabilities.push('kanban-task-lifecycle');
    } else {
        responsibilities.push('Use the board as shared context, but do not own routine delivery tasks by default');
        protocol.push('Do not claim or progress routine tasks unless explicitly instructed');
        capabilities.push('kanban-context-only');
        disallowedTools.push('start_task', 'complete_task', 'report_blocker', 'resolve_blocker');
    }

    if (boardAuthority) {
        responsibilities.push('Manage board structure and task coordination when the role explicitly owns board authority');
        protocol.push('Use create_task and update_task carefully because you hold global board authority');
        capabilities.push('kanban-board-authority');
    } else {
        disallowedTools.push('create_task', 'update_task', 'delete_task');
    }

    const contextInjection = [
        'Kanban profile:',
        '- board_visibility: required',
        `- own_task_lifecycle: ${ownTasks ? 'enabled' : 'disabled'}`,
        `- global_board_authority: ${boardAuthority ? 'enabled' : 'disabled'}`,
    ].join('\n');

    return {
        responsibilities,
        protocol,
        capabilities,
        disallowedTools,
        contextInjection,
    };
}

export function slugifyAgentName(value: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'agent';
}

export function buildManualGenomeSpec(draft: ManualAgentDraft): GenomeSpec {
    const responsibilities = splitListInput(draft.responsibilities);
    const capabilities = splitListInput(draft.capabilities);
    const tags = splitListInput(draft.tags);
    const kanban = buildKanbanCapabilityDefinition({
        ownTasks: draft.kanbanOwnTasks,
        boardAuthority: draft.kanbanBoardAuthority,
    });

    return {
        displayName: draft.displayName.trim(),
        description: draft.description.trim() || undefined,
        baseRoleId: draft.roleId.trim() || undefined,
        category: draft.category,
        runtimeType: draft.runtime,
        systemPrompt: draft.systemPrompt.trim() || undefined,
        responsibilities: [...responsibilities, ...kanban.responsibilities],
        protocol: kanban.protocol,
        capabilities: [...capabilities, ...kanban.capabilities],
        tags: tags.length > 0 ? tags : undefined,
        modelId: draft.modelId.trim() || undefined,
        permissionMode: draft.permissionMode,
        disallowedTools: kanban.disallowedTools,
        contextInjections: [
            {
                trigger: 'on_join',
                content: kanban.contextInjection,
            },
        ],
        behavior: {
            onIdle: 'wait',
            onBlocked: 'report',
            requireExplicitAssignment: false,
            canSpawnAgents: false,
        },
    };
}

export function mergeManualDraftUpdate(
    current: ManualAgentDraft,
    update: Partial<ManualAgentDraft>,
): ManualAgentDraft {
    return {
        ...current,
        ...Object.fromEntries(
            Object.entries(update).filter(([, value]) => value !== undefined),
        ),
    };
}

function normalizeManualDraftSyncPayload(payload: unknown): Partial<ManualAgentDraft> | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const draft = payload as ManualDraftSyncPayload;

    return {
        displayName: normalizeStringValue(draft.displayName),
        description: normalizeStringValue(draft.description),
        category: normalizeEnumValue(draft.category, ['coordination', 'support', 'execution'] as const),
        runtime: normalizeEnumValue(draft.runtime, ['claude', 'codex'] as const),
        roleId: normalizeStringValue(draft.roleId),
        systemPrompt: normalizeStringValue(draft.systemPrompt),
        responsibilities: normalizeListInput(draft.responsibilities),
        capabilities: normalizeListInput(draft.capabilities),
        tags: normalizeListInput(draft.tags),
        modelId: normalizeStringValue(draft.modelId),
        permissionMode: normalizeEnumValue(draft.permissionMode, ['default', 'acceptEdits', 'bypassPermissions'] as const),
        kanbanOwnTasks: normalizeBooleanValue(draft.kanbanOwnTasks),
        kanbanBoardAuthority: normalizeBooleanValue(draft.kanbanBoardAuthority),
    };
}

export function parseManualDraftSyncComment(markdown: string): Partial<ManualAgentDraft> | null {
    const matches = Array.from(markdown.matchAll(/<!--\s*AHA_AGENT_CARD\s*([\s\S]*?)-->/gi));
    const latest = matches.at(-1)?.[1]?.trim();

    if (!latest) {
        return null;
    }

    try {
        const parsed = JSON.parse(latest);
        return normalizeManualDraftSyncPayload(parsed);
    } catch {
        return null;
    }
}

function serializeManualDraftForBuilder(draft: ManualAgentDraft): string {
    return JSON.stringify({
        displayName: draft.displayName,
        description: draft.description,
        category: draft.category,
        runtime: draft.runtime,
        roleId: draft.roleId,
        systemPrompt: draft.systemPrompt,
        responsibilities: splitListInput(draft.responsibilities),
        capabilities: splitListInput(draft.capabilities),
        tags: splitListInput(draft.tags),
        modelId: draft.modelId,
        permissionMode: draft.permissionMode,
        kanbanOwnTasks: draft.kanbanOwnTasks,
        kanbanBoardAuthority: draft.kanbanBoardAuthority,
    }, null, 2);
}

export function buildPrivateAgentBuilderKickoff(options: {
    brief: string;
    currentDraft: ManualAgentDraft;
}): { text: string; displayText: string } {
    const brief = options.brief.trim();

    const text = [
        'We are inside the single-agent creation flow for `/agents/new`.',
        'Your job is to help the user design one reusable agent, not a team or corps.',
        'Reply in the same language as the user.',
        'Ask the smallest next question that removes the most ambiguity.',
        `Whenever your draft changes, append a hidden HTML comment using ${AGENT_CARD_SYNC_COMMENT_TOKEN} with the full current draft JSON.`,
        `Format exactly like: <!-- ${AGENT_CARD_SYNC_COMMENT_TOKEN} {"displayName":"..."} -->`,
        'Use valid JSON only. Include every draft field, not just the changed ones.',
        'Current draft source of truth:',
        serializeManualDraftForBuilder(options.currentDraft),
        brief
            ? `User brief:\n${brief}`
            : 'No brief yet. Start by asking one high-leverage question about the agent mission.',
    ].join('\n\n');

    return {
        text,
        displayText: brief || "Let's design a new agent together.",
    };
}

export function buildPrivateAgentBuilderGenomeSpec(draft: ChatBuilderDraft): GenomeSpec {
    const brief = draft.brief.trim();

    return {
        displayName: draft.displayName.trim(),
        description: 'Private Agent Creator V3 for the single-agent creation flow. It asks focused questions and keeps a live draft synced to the UI.',
        baseRoleId: 'agent-builder',
        category: 'coordination',
        runtimeType: draft.runtime,
        permissionMode: 'default',
        accessLevel: 'read-only',
        executionPlane: 'mainline',
        allowedTools: [
            'Read',
            'Grep',
            'Glob',
            'create_genome',
            'list_available_agents',
            'change_title',
            'remember',
            'recall',
            'get_context_status',
        ],
        systemPrompt: [
            `You are a private Agent Creator V${PRIVATE_AGENT_BUILDER_VERSION} dedicated to the single-agent creation flow.`,
            'This session exists to help one human define one reusable agent clearly and quickly.',
            'Be friendly, concrete, and brief. Ask at most one or two focused questions at a time.',
            'Do not drift into team assembly, marketplace strategy, or corps design unless the user explicitly asks for it.',
            'Treat the editable manual draft as the source of truth for the UI.',
            `Whenever your draft changes, append a hidden HTML comment using ${AGENT_CARD_SYNC_COMMENT_TOKEN} with the full current draft JSON.`,
            `The exact sync format is: <!-- ${AGENT_CARD_SYNC_COMMENT_TOKEN} {"displayName":"..."} -->`,
            'Do not mention the hidden sync comment in your visible prose.',
            'Distinguish confirmed decisions from your recommendations.',
            'If the user wants a ready-made agent instead of authoring one, recommend opening the marketplace rather than forcing a custom draft.',
            'Keep project reading light. Only inspect the minimum files needed to clarify the requested role or constraints.',
            'Default to private draft genomes. Do not publish publicly unless the user explicitly asks for it.',
        ].join('\n'),
        systemPromptSuffix: brief
            ? `Current brief from the user:\n${brief}`
            : undefined,
        responsibilities: [
            'Help the user design one reusable agent at a time',
            'Ask focused questions that improve the draft quickly',
            'Keep the manual draft synced through hidden structured updates',
            'Recommend an existing marketplace agent if that is the simpler answer',
            'Create a genome only after the user approves the draft',
        ],
        protocol: [
            'Start with the smallest useful question',
            'After each material draft change, emit a full draft sync comment',
            'Keep recommendations tied to the actual task, tools, and permissions the agent will need',
            'Prefer narrow, legible agents over vague generalists',
        ],
        capabilities: [
            'single-agent-design',
            'draft-sync',
            'prompt-polishing',
            'permission-scoping',
        ],
        tags: ['private-builder', 'agent-creation', 'v3'],
        messaging: {
            receiveUserMessages: true,
            listenFrom: '*',
            replyMode: 'responsive',
        },
        behavior: {
            onIdle: 'ask',
            onBlocked: 'report',
            requireExplicitAssignment: false,
            canSpawnAgents: false,
        },
        memory: {
            type: 'session',
        },
        scopeOfResponsibility: {
            outOfScope: [
                'Building or mutating whole teams',
                'Publishing public genomes without explicit approval',
                'Doing unrelated implementation work',
            ],
        },
        validation: {
            smokeTest: {
                requiredTools: ['Read', 'Grep', 'create_genome'],
                healthChecks: [
                    'Can ask a focused first question',
                    'Can recommend a simpler market path when custom creation is unnecessary',
                    'Can emit a valid full draft sync comment',
                ],
            },
        },
        meta: {
            builderKind: 'private-agent-creator',
            builderVersion: PRIVATE_AGENT_BUILDER_VERSION,
            syncCommentToken: AGENT_CARD_SYNC_COMMENT_TOKEN,
        },
    };
}

export function buildAgentBuilderGenomeSpec(draft: ChatBuilderDraft): GenomeSpec {
    const brief = draft.brief.trim();
    const systemPrompt = [
        'You are Agent Builder, the platform specialist responsible for creating high-quality reusable Aha agents.',
        'Your job is not to produce generic prompts. Your job is to understand the product, the runtime, the governance model, and the best existing agent archetypes before you author a genome.',
        'Treat project understanding as mandatory. Before proposing a new agent, inspect the project docs, the canonical system genomes, and the legacy role definitions that already exist in this workspace.',
        'Use the three strongest reference agents as gold standards for discipline: supervisor, help-agent, and org-manager. Study how they define responsibilities, allowed tools, execution plane, permission mode, and protocol.',
        'Treat master, builder, qa, reviewer, and related legacy role prompts as useful raw material, but not as final polished templates. Extract their constraints and improve them rather than copying them blindly.',
        'Every agent design must make explicit decisions about: purpose, archetype, user entrypoint or not, executionPlane, accessLevel, permissionMode, tool access, messaging rules, blocked behavior, idle behavior, evaluation criteria, and marketplace packaging.',
        '',
        'MANDATORY Tier 7 fields — every genome spec MUST include both `messaging` and `behavior` objects:',
        '  messaging: { listenFrom: "*" | string[], receiveUserMessages: boolean, replyMode: "proactive"|"responsive"|"passive" }',
        '  behavior:  { onIdle: "wait"|"self-assign"|"ask", onBlocked: "report"|"escalate"|"retry", canSpawnAgents: boolean, requireExplicitAssignment: boolean }',
        'Do NOT submit a genome without these fields. The platform uses them for message routing and behavioral governance.',
        '',
        'MANDATORY tool baseline — every team agent MUST include these in allowedTools (or the agent cannot participate in the team):',
        '  Universal (all agents): get_team_info, list_tasks, send_team_message, get_context_status, get_self_view, change_title, request_help, remember, recall',
        '  Task lifecycle (most workers): start_task, complete_task, report_blocker, resolve_blocker, add_task_comment',
        '  File access (implementation agents): Read, Grep, Glob, Bash',
        'An agent without task tools is deaf and mute inside the team — never omit them.',
        'NOTE: get_self_view, remember, recall are NOT auto-merged from CORE_TEAM_TOOLS — they MUST be listed explicitly in allowedTools.',
        '',
        'MANDATORY disallowedTools — always block supervisor tools for non-supervisor agents:',
        '  kill_agent, score_agent, score_supervisor_self, save_supervisor_state, delete_task',
        '',
        'For corps / legion creation, use CorpsSpec (not GenomeSpec): members array + bootContext.',
        'Corps is a team template — it does not define routing rules. Each member genome carries its own messaging + behavior.',
        '',
        'Promotion rule: a v1 genome can only be promoted to v2 after supervisor evaluations (evaluationCount >= 3, avgScore >= 80). Never try to promote a newly created genome immediately.',
        '',
        'When requirements are ambiguous, ask focused questions after doing the available project reading first.',
        'When the user asks for options, present concrete tradeoffs rather than generic brainstorming.',
        'When the user approves a draft, call create_genome with a polished spec and explain what fields you chose and why.',
        'If the user asks for public availability, create the genome with isPublic=true. Otherwise default to private draft genomes.',
        'Favor explicit boundaries over extra capability. A high-quality agent is narrow, legible, governable, and easy for supervisor to evaluate.',
        'Never inherit worker-only behavior accidentally. If a role pattern is inappropriate for the new agent, rewrite it from first principles.',
        'Before creating any genome, run a consistency review: check that the proposed agent matches the platform architecture, the runtime model, the collaboration model, and the best existing reference patterns.',
    ].join('\n');

    const startupChecklist = [
        'Primary source of truth for this session:',
        `- Read \`${AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE}\` first. Treat it as the canonical Builder knowledge base.`,
        '- Use that file to understand the platform, the five agent interfaces, the canonical reference agents, and the consistency-review checklist.',
        '- Only open raw source documents when you need deeper evidence or the knowledge base explicitly says a decision needs verification.',
        '- This is a special agent dedicated to designing and creating other agents. In agent-authoring workflows, you may use create_agent after design review and genome creation are complete.',
        '',
        'Deep reference appendix available if needed:',
        ...AGENT_BUILDER_DEEP_REFERENCES.map((path, index) => `${index + 1}. \`${path}\``),
        '',
        'Then summarize back to the user:',
        '- what this project does',
        '- which agent interfaces exist in this workspace',
        '- which canonical agents are the best templates for the requested use case',
        '- which legacy prompts are under-polished and need improvement',
        '',
        'When you propose an agent, include this design record:',
        '1. Mission',
        '2. Agent archetype (system governance / coordinator / worker / support / research / product specialist)',
        '3. Runtime + execution plane',
        '4. Permission model + allowed/disallowed tools',
        '5. Messaging / reply mode / onIdle / onBlocked',
        '6. Responsibilities, protocol, and evaluation criteria',
        '7. Marketplace packaging (name, category, tags, public/private)',
        '8. Consistency review against the canonical references and platform architecture',
        '',
        'If the workspace lacks documentation for a decision, say so explicitly instead of hallucinating.',
    ].join('\n');

    return {
        displayName: draft.displayName.trim(),
        description: 'Chat-based genome architect that studies the project, critiques existing agents, and creates higher-quality reusable agents.',
        executionPlane: 'mainline',
        accessLevel: 'full-access',
        category: 'coordination',
        runtimeType: draft.runtime,
        permissionMode: 'acceptEdits',
        allowedTools: [
            'Read',
            'Grep',
            'Glob',
            'Bash',
            'Edit',
            'MultiEdit',
            'get_team_info',
            'list_tasks',
            'create_genome',
            'create_agent',
            'list_available_agents',
            'send_team_message',
            'remember',
            'recall',
            'get_context_status',
            'change_title',
        ],
        disallowedTools: [
            'kill_agent',
            'score_agent',
            'score_supervisor_self',
            'save_supervisor_state',
            'request_help',
            'delete_task',
        ],
        systemPrompt,
        systemPromptSuffix: [
            startupChecklist,
            brief ? `Current creation brief from the user:\n${brief}` : null,
        ].filter(Boolean).join('\n\n'),
        contextInjections: [
            {
                trigger: 'on_join',
                content: `Primary knowledge base: ${AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE}\nRead this before proposing or creating any genome.`,
            },
        ],
        responsibilities: [
            `Read the primary Builder knowledge base at ${AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE} before designing any agent`,
            'Read the project context and existing agent system before designing new agents',
            'Extract the strongest constraints and protocols from canonical agents',
            'Improve weak or under-polished legacy role prompts into higher-quality genomes',
            'Perform a consistency review before creating any genome',
            'Draft explicit genome specs with clear interfaces, tool policies, and evaluation criteria',
            'Create or spawn follow-up agents only when the workflow is specifically about agent authoring and the design has already been reviewed',
            'Create polished reusable genomes after user approval',
        ],
        protocol: [
            'Inspect project docs and architecture references before proposing a genome',
            'Summarize the current platform and reference-agent constraints back to the user',
            'Classify the requested agent archetype before drafting prompt details',
            'Produce a design record covering runtime, tools, messaging, behavior, and evaluation',
            'Run a consistency review against supervisor/help-agent/org-manager and relevant legacy roles',
            'Only call create_genome after the user approves or explicitly asks for creation',
            'Only call create_agent when the task is explicitly about creating or assembling agents, not for unrelated delivery work',
        ],
        capabilities: [
            'project-architecture-synthesis',
            'agent-interface-design',
            'constraint-extraction',
            'prompt-polishing',
            'agent-design',
            'genome-authoring',
            'marketplace-packaging',
        ],
        tags: ['agent-builder', 'genome', 'marketplace'],
        messaging: {
            receiveUserMessages: true,
            listenFrom: '*',
            replyMode: 'responsive',
        },
        behavior: {
            onIdle: 'ask',
            onBlocked: 'report',
            requireExplicitAssignment: false,
            canSpawnAgents: true,
        },
        memory: {
            type: 'session',
            knowledgeBase: [AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE],
        },
        scopeOfResponsibility: {
            outOfScope: [
                'Implementing product features unrelated to genome design',
                'Mutating running teams or system agents directly',
                'Creating public marketplace genomes before the user confirms quality and packaging',
            ],
        },
        validation: {
            smokeTest: {
                requiredTools: ['create_genome', 'Read', 'Grep'],
                requiredFiles: [AGENT_BUILDER_PRIMARY_KNOWLEDGE_BASE],
                healthChecks: [
                    'Can explain the primary Builder knowledge base before proposing a genome',
                    'Can summarize the project architecture in plain language',
                    'Can compare canonical agents and legacy prompts before authoring a genome',
                    'Can explain tool policy and behavior choices before creation',
                ],
            },
        },
    };
}

export function getTeamDerivedGenomes(genomes: Genome[]): Genome[] {
    return genomes.filter((genome) => !!genome.teamId);
}
