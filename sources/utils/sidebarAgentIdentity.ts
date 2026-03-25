const RUNTIME_FLAVORS = new Set(['claude', 'codex', 'open-code']);

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
