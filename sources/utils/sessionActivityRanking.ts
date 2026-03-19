import type { Session } from '@/sync/storageTypes';

export type SessionActivitySnapshot = {
    totalTokens: number;
    usageTimestamp: number;
    smoothedRate: number;
};

export type SessionActivityMetric = {
    tokenRate: number;
    tokenRateBucket: number;
};

export type AgentSidebarSortEntry = {
    inactive: boolean;
    dead: boolean;
    tokenRateBucket: number;
    stableOrder: number;
    name: string;
};

const RATE_EMA_ALPHA = 0.35;
const RATE_DECAY_WINDOW_MS = 45000;
const LIGHT_RATE_THRESHOLD = 10;
const WARM_RATE_THRESHOLD = 60;
const HOT_RATE_THRESHOLD = 160;

function getUsageTotalTokens(session: Pick<Session, 'latestUsage'>): number {
    const usage = session.latestUsage;
    if (!usage) {
        return 0;
    }

    return [
        usage.inputTokens,
        usage.outputTokens,
        usage.cacheCreation,
        usage.cacheRead,
    ].reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

function decayTokenRate(rate: number, ageMs: number): number {
    if (!Number.isFinite(rate) || rate <= 0) {
        return 0;
    }

    if (ageMs <= 0) {
        return rate;
    }

    if (ageMs >= RATE_DECAY_WINDOW_MS) {
        return 0;
    }

    return rate * (1 - (ageMs / RATE_DECAY_WINDOW_MS));
}

export function getTokenRateBucket(rate: number): number {
    if (!Number.isFinite(rate) || rate < LIGHT_RATE_THRESHOLD) {
        return 0;
    }

    if (rate >= HOT_RATE_THRESHOLD) {
        return 3;
    }

    if (rate >= WARM_RATE_THRESHOLD) {
        return 2;
    }

    return 1;
}

export function getTokenRateAccentColor(bucket: number): string {
    if (bucket >= 3) {
        return '#FF8A00';
    }

    if (bucket === 2) {
        return '#2E90FA';
    }

    if (bucket === 1) {
        return '#34C759';
    }

    return '#8A9BAA';
}

function formatCompactNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return value >= 10000 ? `${Math.round(value / 1000)}K` : `${(value / 1000).toFixed(1)}K`;
    }

    if (value >= 100) {
        return String(Math.round(value));
    }

    if (value >= 10) {
        return value.toFixed(1).replace(/\.0$/, '');
    }

    return value.toFixed(1).replace(/\.0$/, '');
}

export function formatTokenRateLabel(rate: number): string | undefined {
    if (!Number.isFinite(rate) || rate < LIGHT_RATE_THRESHOLD) {
        return undefined;
    }

    return `${formatCompactNumber(rate)} tok/s`;
}

export function getStableSessionOrder(session: Pick<Session, 'createdAt' | 'metadata'>): number {
    const processStartedAt = session.metadata?.processStartedAt;
    if (typeof processStartedAt === 'number' && Number.isFinite(processStartedAt)) {
        return processStartedAt;
    }

    return session.createdAt;
}

export function compareAgentSidebarEntries(left: AgentSidebarSortEntry, right: AgentSidebarSortEntry): number {
    if (left.inactive !== right.inactive) {
        return left.inactive ? 1 : -1;
    }

    if (left.inactive && right.inactive && left.dead !== right.dead) {
        return left.dead ? 1 : -1;
    }

    if (left.tokenRateBucket !== right.tokenRateBucket) {
        return right.tokenRateBucket - left.tokenRateBucket;
    }

    if (left.stableOrder !== right.stableOrder) {
        return left.stableOrder - right.stableOrder;
    }

    return left.name.localeCompare(right.name);
}

export function buildSessionActivityMetrics(
    sessions: ReadonlyArray<Pick<Session, 'id' | 'createdAt' | 'latestUsage'>>,
    previousSnapshots: ReadonlyMap<string, SessionActivitySnapshot>,
    now: number = Date.now(),
): {
    metrics: Map<string, SessionActivityMetric>;
    snapshots: Map<string, SessionActivitySnapshot>;
} {
    const metrics = new Map<string, SessionActivityMetric>();
    const snapshots = new Map<string, SessionActivitySnapshot>();

    sessions.forEach((session) => {
        const usageTimestamp = session.latestUsage?.timestamp ?? 0;
        const totalTokens = getUsageTotalTokens(session);
        const previous = previousSnapshots.get(session.id);
        let smoothedRate = previous?.smoothedRate ?? 0;

        if (usageTimestamp > 0) {
            if (previous && usageTimestamp > previous.usageTimestamp) {
                const elapsedSeconds = Math.max((usageTimestamp - previous.usageTimestamp) / 1000, 1);
                const deltaTokens = totalTokens >= previous.totalTokens
                    ? totalTokens - previous.totalTokens
                    : totalTokens;
                const instantRate = deltaTokens > 0 ? deltaTokens / elapsedSeconds : 0;

                smoothedRate = previous.smoothedRate > 0
                    ? previous.smoothedRate + ((instantRate - previous.smoothedRate) * RATE_EMA_ALPHA)
                    : instantRate;
            } else if (!previous) {
                smoothedRate = 0;
            }
        } else {
            smoothedRate = 0;
        }

        const usageAgeMs = usageTimestamp > 0 ? Math.max(0, now - usageTimestamp) : RATE_DECAY_WINDOW_MS;
        const tokenRate = decayTokenRate(smoothedRate, usageAgeMs);

        snapshots.set(session.id, {
            totalTokens,
            usageTimestamp,
            smoothedRate,
        });
        metrics.set(session.id, {
            tokenRate,
            tokenRateBucket: getTokenRateBucket(tokenRate),
        });
    });

    return {
        metrics,
        snapshots,
    };
}
