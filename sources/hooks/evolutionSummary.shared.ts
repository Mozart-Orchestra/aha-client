export type EvolutionEvidenceCategory = 'runtime' | 'code' | 'rating' | 'review' | 'collaboration';

export interface EvolutionEvidenceItem {
    id: string;
    teamId: string;
    category: EvolutionEvidenceCategory;
    source: string;
    title: string;
    summary: string;
    timestamp: string;
    actor?: string;
}

export interface EvolutionRecommendation {
    id: string;
    type: string;
    title: string;
    summary: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
    scoreDelta: number;
    why: string[];
    nextAction: string;
    evidence: EvolutionEvidenceItem[];
}

export interface EvolutionSummary {
    teamId: string;
    generatedAt: string;
    period: {
        start: string;
        end: string;
        days: number;
    };
    score: {
        current: number;
        previous: number;
        delta: number;
        trend: 'up' | 'down' | 'flat';
    };
    signals: {
        ratingTrend: 'improving' | 'stable' | 'declining';
        blockingRate: number;
        avgCompletionTime: number;
        idleRate: number;
        coordinatorMessageRatio?: number;
        readyPingRatio?: number;
    };
    evidenceCounts: Record<EvolutionEvidenceCategory, number>;
    recommendations: EvolutionRecommendation[];
    memory: {
        summary: string;
        highlights: string[];
        nextActions: string[];
    };
}

const EMPTY_COUNTS: Record<EvolutionEvidenceCategory, number> = {
    runtime: 0,
    code: 0,
    rating: 0,
    review: 0,
    collaboration: 0,
};

export function normalizeEvolutionSummaryResponse(raw: unknown, teamId: string): EvolutionSummary {
    const payload = (raw ?? {}) as Record<string, any>;
    const now = new Date().toISOString();
    const evidenceCounts = payload.evidenceCounts ?? EMPTY_COUNTS;

    return {
        teamId: typeof payload.teamId === 'string' ? payload.teamId : teamId,
        generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : now,
        period: {
            start: typeof payload.period?.start === 'string' ? payload.period.start : now,
            end: typeof payload.period?.end === 'string' ? payload.period.end : now,
            days: typeof payload.period?.days === 'number' ? payload.period.days : 7,
        },
        score: {
            current: Number(payload.score?.current ?? 0),
            previous: Number(payload.score?.previous ?? 0),
            delta: Number(payload.score?.delta ?? 0),
            trend: payload.score?.trend === 'up' || payload.score?.trend === 'down' ? payload.score.trend : 'flat',
        },
        signals: {
            ratingTrend: payload.signals?.ratingTrend === 'improving' || payload.signals?.ratingTrend === 'declining'
                ? payload.signals.ratingTrend
                : 'stable',
            blockingRate: Number(payload.signals?.blockingRate ?? 0),
            avgCompletionTime: Number(payload.signals?.avgCompletionTime ?? 0),
            idleRate: Number(payload.signals?.idleRate ?? 0),
            coordinatorMessageRatio: payload.signals?.coordinatorMessageRatio !== undefined
                ? Number(payload.signals.coordinatorMessageRatio)
                : undefined,
            readyPingRatio: payload.signals?.readyPingRatio !== undefined
                ? Number(payload.signals.readyPingRatio)
                : undefined,
        },
        evidenceCounts: {
            runtime: Number(evidenceCounts.runtime ?? 0),
            code: Number(evidenceCounts.code ?? 0),
            rating: Number(evidenceCounts.rating ?? 0),
            review: Number(evidenceCounts.review ?? 0),
            collaboration: Number(evidenceCounts.collaboration ?? 0),
        },
        recommendations: Array.isArray(payload.recommendations)
            ? payload.recommendations.map((item: Record<string, any>, index: number) => ({
                id: typeof item.id === 'string' ? item.id : `rec-${index}`,
                type: typeof item.type === 'string' ? item.type : 'recompose',
                title: typeof item.title === 'string' ? item.title : 'Evolution recommendation',
                summary: typeof item.summary === 'string' ? item.summary : 'Inspect the latest evidence and adjust the team if needed.',
                priority: item.priority === 'high' || item.priority === 'medium' ? item.priority : 'low',
                confidence: Number(item.confidence ?? 0),
                scoreDelta: Number(item.scoreDelta ?? 0),
                why: Array.isArray(item.why) ? item.why.filter((entry): entry is string => typeof entry === 'string') : [],
                nextAction: typeof item.nextAction === 'string' ? item.nextAction : 'Open the evolution workspace for details.',
                evidence: Array.isArray(item.evidence)
                    ? item.evidence.map((evidence: Record<string, any>, evidenceIndex: number) => ({
                        id: typeof evidence.id === 'string' ? evidence.id : `evidence-${index}-${evidenceIndex}`,
                        teamId: typeof evidence.teamId === 'string' ? evidence.teamId : teamId,
                        category: evidence.category === 'runtime' || evidence.category === 'code' || evidence.category === 'rating' || evidence.category === 'review'
                            ? evidence.category
                            : 'collaboration',
                        source: typeof evidence.source === 'string' ? evidence.source : 'unknown',
                        title: typeof evidence.title === 'string' ? evidence.title : 'Evidence',
                        summary: typeof evidence.summary === 'string' ? evidence.summary : 'No evidence summary available.',
                        timestamp: typeof evidence.timestamp === 'string' ? evidence.timestamp : now,
                        actor: typeof evidence.actor === 'string' ? evidence.actor : undefined,
                    }))
                    : [],
            }))
            : [],
        memory: {
            summary: typeof payload.memory?.summary === 'string' ? payload.memory.summary : 'Evolution evidence is still warming up for this team.',
            highlights: Array.isArray(payload.memory?.highlights)
                ? payload.memory.highlights.filter((entry: unknown): entry is string => typeof entry === 'string')
                : [],
            nextActions: Array.isArray(payload.memory?.nextActions)
                ? payload.memory.nextActions.filter((entry: unknown): entry is string => typeof entry === 'string')
                : [],
        },
    };
}
