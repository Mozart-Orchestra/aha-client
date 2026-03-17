/**
 * presenceUtils.ts
 *
 * Pure utility functions for agent presence state — no React dependency.
 * These can be safely imported in both component and test contexts.
 */

const DEAD_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour without activity = "ended"

export interface AgentPresenceVisual {
    /** Presence-driven dot color: green / grey / dark-grey */
    dotColor: string;
    /** True when session is not active (offline or dead) */
    inactive: boolean;
    /** True when session has been inactive for over 1 hour */
    dead: boolean;
}

/**
 * Returns presence-driven visual properties for an agent sidebar row.
 *
 * Three states:
 *   - online  (active=true):           green     #22C55E
 *   - offline (inactive, <1h):         grey      #8A7F74
 *   - dead    (inactive, ≥1h or no activeAt): dark-grey #4A4040
 */
export function getAgentPresenceVisual(session: { active: boolean; activeAt: number }): AgentPresenceVisual {
    if (session.active) {
        return { dotColor: '#22C55E', inactive: false, dead: false };
    }
    const isDead = session.activeAt > 0 && (Date.now() - session.activeAt > DEAD_THRESHOLD_MS);
    return {
        dotColor: isDead ? '#4A4040' : '#8A7F74',
        inactive: true,
        dead: isDead,
    };
}
