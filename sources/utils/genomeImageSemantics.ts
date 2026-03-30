import type { LegionImage, GenomeRecord } from '@/utils/genomeHub';

export type GenomeImageKind = 'agent' | 'legion';

export interface GenomeImageEmptyState {
    title: string;
    hint: string;
}

export interface LegionLayerFact {
    label: string;
    value: string;
}

export function getGenomeImageKind(
    genome?: Pick<GenomeRecord, 'kind' | 'category'> | null,
): GenomeImageKind {
    if (genome?.kind === 'agent' || genome?.kind === 'legion') {
        return genome.kind;
    }

    return genome?.category === 'corps' ? 'legion' : 'agent';
}

export function getGenomeImageLabel(kind: GenomeImageKind): 'AgentImage' | 'LegionImage' {
    return kind === 'legion' ? 'LegionImage' : 'AgentImage';
}

export function getGenomeImagePluralLabel(kind: GenomeImageKind): 'Agent Images' | 'Legion Images' {
    return kind === 'legion' ? 'Legion Images' : 'Agent Images';
}

export function getGenomeImageMirrorTitle(kind: GenomeImageKind): string {
    return `view · ${getGenomeImageLabel(kind)} Mirror`;
}

export function getGenomeImageSeedTitle(kind: GenomeImageKind): string {
    return `view-not-diff · ${getGenomeImageLabel(kind)} Seed`;
}

export function getGenomeImageSurfaceTitle(kind: GenomeImageKind): string {
    return kind === 'legion'
        ? 'LegionImage · Layer Surface'
        : 'AgentImage · Package Surface';
}

export function getGenomeImageEmptyState(kind: GenomeImageKind): GenomeImageEmptyState {
    return kind === 'legion'
        ? {
            title: 'No Legion Images found',
            hint: 'Legion Images are multi-agent templates with LegionLayer coordination.',
        }
        : {
            title: 'No Agent Images found',
            hint: 'Try a different search or category.',
        };
}

export function getLegionLayerFacts(legionSpec?: LegionImage | null): LegionLayerFact[] {
    const facts: LegionLayerFact[] = [];
    const bootContext = legionSpec?.bootContext;
    const taskPolicy = bootContext?.taskPolicy;

    if (bootContext?.initialObjective?.trim()) {
        facts.push({ label: 'Initial Objective', value: bootContext.initialObjective.trim() });
    }
    if (bootContext?.sharedContext?.length) {
        facts.push({ label: 'Shared Context', value: bootContext.sharedContext.join('\n') });
    }
    if (bootContext?.commandChain?.length) {
        facts.push({ label: 'Command Chain', value: bootContext.commandChain.join('\n') });
    }
    if (taskPolicy?.boardIsSourceOfTruth) {
        facts.push({ label: 'Board Source', value: 'Kanban board is source of truth' });
    }
    if (taskPolicy?.requireTaskForExecution) {
        facts.push({ label: 'Execution Gate', value: 'Task required for execution' });
    }
    if (taskPolicy?.forbidChatOnlyExecution) {
        facts.push({ label: 'Chat-only Execution', value: 'Forbidden' });
    }
    if (taskPolicy?.forbidPeerToPeerRouting) {
        facts.push({ label: 'Peer Routing', value: 'Forbidden' });
    }

    return facts;
}
