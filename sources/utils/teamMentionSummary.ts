export interface TeamMentionSummaryAgent {
    displayName?: string;
    roleLabel?: string;
}

function getPrimaryAgentLabel(agent: TeamMentionSummaryAgent): string {
    return agent.displayName?.trim() || agent.roleLabel?.trim() || 'Agent';
}

export function buildMentionChipLabel(agents: TeamMentionSummaryAgent[]): string | null {
    if (agents.length === 0) {
        return null;
    }

    const primaryLabel = getPrimaryAgentLabel(agents[0]);
    if (agents.length === 1) {
        return `@${primaryLabel}`;
    }

    return `@${primaryLabel} +${agents.length - 1}`;
}

export function buildMentionFlowLabel(
    senderLabel: string | undefined,
    agents: TeamMentionSummaryAgent[]
): string | null {
    const mentionLabel = buildMentionChipLabel(agents);
    if (!mentionLabel) {
        return null;
    }

    const sender = senderLabel?.trim();
    if (!sender) {
        return mentionLabel;
    }

    return `${sender} -> ${mentionLabel}`;
}

export function buildMentionChipAccessibilityLabel(agents: TeamMentionSummaryAgent[]): string | null {
    if (agents.length === 0) {
        return null;
    }

    const primaryLabel = getPrimaryAgentLabel(agents[0]);
    if (agents.length === 1) {
        return `Mentioned ${primaryLabel}`;
    }

    return `Mentioned ${primaryLabel} and ${agents.length - 1} more`;
}

export function buildMentionFlowAccessibilityLabel(
    senderLabel: string | undefined,
    agents: TeamMentionSummaryAgent[]
): string | null {
    const mentionAccessibility = buildMentionChipAccessibilityLabel(agents);
    if (!mentionAccessibility) {
        return null;
    }

    const sender = senderLabel?.trim();
    if (!sender) {
        return mentionAccessibility;
    }

    return `${sender} mentioned ${mentionAccessibility.replace(/^Mentioned\s+/i, '')}`;
}
