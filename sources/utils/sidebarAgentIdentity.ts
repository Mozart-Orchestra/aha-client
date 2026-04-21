import type { KanbanTeamMember } from '@/sync/kanbanTypes';
import type { Session } from '@/sync/storageTypes';
import { resolveImageRef, type ImageRef } from './imageRef';

const RUNTIME_FLAVORS = new Set(['claude', 'codex', 'open-code']);
const SIDEBAR_OFFICIAL_CANONICAL_ROLE_IDS = new Set([
    'supervisor',
    'help-agent',
    'org-manager',
    'master',
    'agent-builder',
    'agent-builder-codex',
    'implementer',
    'qa-engineer',
    'researcher',
    'gstack-product-strategist',
    'gstack-engineering-reviewer',
    'gstack-fullstack-builder',
    'gstack-qa-commander',
    'gstack-design-architect',
    'gstack-security-officer',
    'gstack-release-engineer',
    'gstack-retro-analyst',
]);
const SIDEBAR_OFFICIAL_ROLE_ALIASES: Record<string, string> = {
    architect: 'researcher',
    'solution-architect': 'researcher',
    framer: 'researcher',
    builder: 'implementer',
    reviewer: 'qa-engineer',
    qa: 'qa-engineer',
    scout: 'researcher',
    observer: 'researcher',
    orchestrator: 'master',
    'project-manager': 'master',
    'product-owner': 'master',
    'business-analyst': 'researcher',
    'product-designer': 'researcher',
    'ux-designer': 'researcher',
    'ux-researcher': 'researcher',
    scribe: 'researcher',
    'technical-writer': 'researcher',
    'spec-writer': 'researcher',
    'product-strategist': 'gstack-product-strategist',
    'engineering-reviewer': 'gstack-engineering-reviewer',
    'code-engineer': 'gstack-fullstack-builder',
    'qa-commander': 'gstack-qa-commander',
    'design-architect': 'gstack-design-architect',
    'design-lead': 'gstack-design-architect',
    'security-officer': 'gstack-security-officer',
    'release-engineer': 'gstack-release-engineer',
    'retro-analyst': 'gstack-retro-analyst',
    'run-analyst': 'gstack-retro-analyst',
};

function normalizeValue(value?: string | null): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeRoleKey(value: string): string {
    return value.trim().toLowerCase();
}

export function isRuntimeFlavor(value?: string | null): boolean {
    const normalized = normalizeRoleKey(normalizeValue(value));
    return normalized.length > 0 && RUNTIME_FLAVORS.has(normalized);
}

function normalizeOfficialRoleCandidate(value: string): string {
    return normalizeRoleKey(value).replace(/[\s_]+/g, '-');
}

export interface SidebarAgentIdentityInput {
    memberRoleId?: string | null;
    sessionRole?: string | null;
    sessionFlavor?: string | null;
    runtimeType?: string | null;
}

export interface SidebarAgentIdentity {
    roleKey: string;
    displayRole: string;
    runtimeLabel: string;
}

export interface SidebarAgentImageRefInput {
    member?: Pick<KanbanTeamMember, 'sourceImageId' | 'sourceImageVersion' | 'genomeId' | 'genomeVersion' | 'specId'> | null;
    session?: Pick<Session, 'metadata'> | null;
}

export function resolveSidebarAgentIdentity(input: SidebarAgentIdentityInput): SidebarAgentIdentity {
    const memberRoleId = normalizeValue(input.memberRoleId);
    const sessionRole = normalizeValue(input.sessionRole);
    const sessionFlavor = normalizeValue(input.sessionFlavor);
    const runtimeType = normalizeValue(input.runtimeType);

    const roleKey = memberRoleId || sessionRole || (isRuntimeFlavor(sessionFlavor) ? '' : sessionFlavor);
    const runtimeLabel = runtimeType || (isRuntimeFlavor(sessionFlavor) ? sessionFlavor : '');
    const displayRole = roleKey || runtimeLabel;

    return {
        roleKey,
        displayRole,
        runtimeLabel,
    };
}

export function resolveSidebarAgentImageRef(input: SidebarAgentImageRefInput): ImageRef | null {
    const memberRef = resolveImageRef(input.member);
    if (memberRef) {
        return memberRef;
    }

    const metadata = input.session?.metadata as Record<string, unknown> | null | undefined;
    if (!metadata) {
        return null;
    }

    return resolveImageRef({
        sourceImageId: typeof metadata.sourceImageId === 'string' ? metadata.sourceImageId : null,
        sourceImageVersion: typeof metadata.sourceImageVersion === 'number' ? metadata.sourceImageVersion : null,
        genomeId: typeof metadata.genomeId === 'string' ? metadata.genomeId : null,
        genomeVersion: typeof metadata.genomeVersion === 'number' ? metadata.genomeVersion : null,
        specId: typeof metadata.specId === 'string' ? metadata.specId : null,
    });
}

export function resolveSidebarGenomeRoleCandidates(value: string): string[] {
    const normalized = normalizeOfficialRoleCandidate(value);
    if (!normalized) {
        return [];
    }

    const canonical = SIDEBAR_OFFICIAL_ROLE_ALIASES[normalized] ?? normalized;
    if (!SIDEBAR_OFFICIAL_CANONICAL_ROLE_IDS.has(canonical)) {
        return [];
    }

    // Sidebar score lookups are official-only. Query the canonical role directly so
    // retired aliases do not generate guaranteed 404s before we reach the real image.
    return [canonical];
}
