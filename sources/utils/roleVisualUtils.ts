/**
 * Shared agent role visual system.
 *
 * Extracted from TeamChatRoom.tsx so that any component can produce
 * consistent avatar colours, icons, and badge labels for any agent role.
 */
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ─── Role normalisation ───────────────────────────────────────────────────────

/** Maps the raw `roleId` strings used in team membership to canonical role keys. */
const ROLE_ALIAS: Record<string, string> = {
    master: 'orchestrator',
    builder: 'implementer',
    framer: 'architect',
    scout: 'researcher',
    scribe: 'observer',
    qa: 'qa-engineer',
    reviewer: 'observer',
    user: 'user',
    'agent-builder': 'agent-builder',
    'org-manager': 'org-manager',
    supervisor: 'supervisor',
    'help-agent': 'help-agent',
};

export function normaliseRoleId(roleId: string | undefined): string {
    if (!roleId) return 'user';
    return ROLE_ALIAS[roleId] ?? roleId;
}

// ─── Role visual descriptor ───────────────────────────────────────────────────

export interface RoleVisual {
    /** Emoji label rendered inside the avatar (mutually exclusive with avatarIcon). */
    avatarLabel?: string;
    /** Ionicon name rendered inside the avatar. */
    avatarIcon?: IoniconName;
    /** Background colour for the avatar circle. */
    avatarBackground: string;
    /** Short uppercase badge label, e.g. "MASTER", "BUILDER". */
    badgeLabel?: string;
    /** Translucent background for the badge pill. */
    badgeBackground?: string;
    /** Text colour for the badge pill. */
    badgeTextColor?: string;
    /** Colour used for the online presence dot. */
    dotColor?: string;
}

/** Derive a plain uppercase initials string for roles without an icon. */
export function getAvatarInitials(roleId: string | undefined, displayName: string | undefined): string {
    const normalised = normaliseRoleId(roleId);
    const name = displayName || normalised || '?';
    return name.substring(0, 2).toUpperCase();
}

/**
 * Return the full `RoleVisual` descriptor for a given roleId / displayName pair.
 * This is the single source of truth for avatar colours and icons across the app.
 */
export function getRoleVisual(roleId: string | undefined, displayName?: string): RoleVisual {
    const normalised = normaliseRoleId(roleId);

    switch (normalised) {
        case 'orchestrator':
            return {
                avatarIcon: 'sparkles-outline',
                avatarBackground: '#C8860A',
                badgeLabel: 'MASTER',
                badgeBackground: '#C8860A20',
                badgeTextColor: '#B27006',
                dotColor: '#C8860A',
            };

        case 'implementer':
            return {
                avatarIcon: 'hammer-outline',
                avatarBackground: '#E05C2A',
                badgeLabel: 'BUILDER',
                badgeBackground: '#E05C2A20',
                badgeTextColor: '#C04820',
                dotColor: '#34C759',
            };

        case 'architect':
            return {
                avatarIcon: 'git-branch-outline',
                avatarBackground: '#4A6FD4',
                badgeLabel: 'ARCHITECT',
                badgeBackground: '#4A6FD420',
                badgeTextColor: '#3A5BC0',
                dotColor: '#4A6FD4',
            };

        case 'qa-engineer':
            return {
                avatarIcon: 'flask-outline',
                avatarBackground: '#9B3DCA',
                badgeLabel: 'QA',
                badgeBackground: '#9B3DCA20',
                badgeTextColor: '#7B2DAA',
                dotColor: '#9B3DCA',
            };

        case 'researcher':
        case 'observer':
            return {
                avatarIcon: 'eye-outline',
                avatarBackground: '#0EA5A0',
                badgeLabel: normalised === 'researcher' ? 'RESEARCH' : 'REVIEW',
                badgeBackground: '#0EA5A020',
                badgeTextColor: '#0A8580',
                dotColor: '#0EA5A0',
            };

        case 'agent-builder':
            return {
                avatarLabel: '🧬',
                avatarBackground: '#2DA44E',
                badgeLabel: 'AG.BUILDER',
                badgeBackground: '#2DA44E20',
                badgeTextColor: '#1A8A38',
                dotColor: '#2DA44E',
            };

        case 'org-manager':
            return {
                avatarLabel: '🏛️',
                avatarBackground: '#1D6FA4',
                badgeLabel: 'ORG',
                badgeBackground: '#1D6FA420',
                badgeTextColor: '#145A88',
                dotColor: '#1D6FA4',
            };

        case 'supervisor':
            return {
                avatarLabel: '🔭',
                avatarBackground: '#6D5ACF',
                badgeLabel: 'SUPERVISOR',
                badgeBackground: '#6D5ACF20',
                badgeTextColor: '#5444B5',
                dotColor: '#6D5ACF',
            };

        case 'help-agent':
            return {
                avatarLabel: '🛟',
                avatarBackground: '#D4821A',
                badgeLabel: 'HELP',
                badgeBackground: '#D4821A20',
                badgeTextColor: '#B06812',
                dotColor: '#D4821A',
            };

        case 'user':
            return {
                avatarIcon: 'person-outline',
                avatarBackground: '#4A7FAE',
                dotColor: '#4A7FAE',
            };

        default:
            return {
                avatarLabel: getAvatarInitials(roleId, displayName),
                avatarBackground: '#5C7A8F',
                dotColor: '#34C759',
            };
    }
}

// ─── Human-readable role labels ───────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    orchestrator: 'Master',
    implementer: 'Builder',
    architect: 'Architect',
    'qa-engineer': 'QA Engineer',
    researcher: 'Researcher',
    observer: 'Observer',
    'agent-builder': 'Agent Builder',
    'org-manager': 'Org Manager',
    supervisor: 'Supervisor',
    'help-agent': 'Help Agent',
    user: 'User',
};

/**
 * Returns a human-readable role label.
 * Falls back to the raw `roleId` if unknown.
 */
export function getRoleLabel(roleId: string | undefined): string {
    const normalised = normaliseRoleId(roleId);
    return ROLE_LABELS[normalised] ?? (roleId ?? 'Agent');
}

/**
 * Return a short display name for an agent.
 * Priority: displayName → role label → first-8 chars of sessionId.
 */
export function resolveDisplayName(
    displayName: string | undefined,
    roleId: string | undefined,
    sessionId: string | undefined,
): string {
    if (displayName) return displayName;
    if (roleId) return getRoleLabel(roleId);
    if (sessionId) return sessionId.slice(0, 8);
    return 'Agent';
}
