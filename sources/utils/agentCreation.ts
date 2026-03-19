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
}

export interface ChatBuilderDraft {
    displayName: string;
    runtime: ManualAgentRuntime;
    brief: string;
}

function splitListInput(value: string): string[] {
    return value
        .split(/\n|,/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
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

    return {
        displayName: draft.displayName.trim(),
        description: draft.description.trim() || undefined,
        baseRoleId: draft.roleId.trim() || undefined,
        category: draft.category,
        runtimeType: draft.runtime,
        systemPrompt: draft.systemPrompt.trim() || undefined,
        responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
        capabilities: capabilities.length > 0 ? capabilities : undefined,
        tags: tags.length > 0 ? tags : undefined,
        modelId: draft.modelId.trim() || undefined,
        permissionMode: draft.permissionMode,
        behavior: {
            onIdle: 'wait',
            onBlocked: 'report',
            requireExplicitAssignment: false,
            canSpawnAgents: false,
        },
    };
}

export function buildAgentBuilderGenomeSpec(draft: ChatBuilderDraft): GenomeSpec {
    const brief = draft.brief.trim();
    const systemPrompt = [
        'You are Agent Builder, a specialist that helps the user design reusable Aha agents.',
        'Your job is to turn vague ideas into a concrete genome spec the user can review.',
        'Ask concise clarifying questions when requirements are missing.',
        'Offer clear tradeoffs across role, runtime, model, permissions, and marketplace positioning.',
        'When the user approves a draft, call create_genome with a polished spec.',
        'If the user wants the result visible in the public marketplace, create the genome with isPublic=true.',
        'Keep the final genome understandable by humans, not only by machines.',
    ].join('\n');

    return {
        displayName: draft.displayName.trim(),
        description: 'Chat-based assistant for designing and publishing reusable agents.',
        baseRoleId: 'builder',
        category: 'coordination',
        runtimeType: draft.runtime,
        permissionMode: 'acceptEdits',
        systemPrompt,
        systemPromptSuffix: brief
            ? `Current creation brief from the user:\n${brief}`
            : undefined,
        responsibilities: [
            'Clarify the user goal and desired workflow',
            'Draft genome specs with explicit role, runtime, model, and tools',
            'Create polished reusable genomes after approval',
            'Default to public marketplace publication only when the user asks for it',
        ],
        capabilities: [
            'agent-design',
            'genome-authoring',
            'marketplace-packaging',
        ],
        tags: ['agent-builder', 'genome', 'marketplace'],
        behavior: {
            onIdle: 'ask',
            onBlocked: 'report',
            requireExplicitAssignment: false,
            canSpawnAgents: false,
        },
    };
}

export function getTeamDerivedGenomes(genomes: Genome[]): Genome[] {
    return genomes.filter((genome) => !!genome.teamId);
}
