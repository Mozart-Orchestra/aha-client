import { describe, expect, it } from 'vitest';

import {
    getGenomeImageEmptyState,
    getGenomeImageKind,
    getGenomeImageLabel,
    getGenomeImageMirrorTitle,
    getGenomeImagePluralLabel,
    getGenomeImageSeedTitle,
    getGenomeImageSurfaceTitle,
    getLegionLayerFacts,
} from './genomeImageSemantics';

describe('genomeImageSemantics', () => {
    it('prefers explicit kind and falls back from legacy corps category to legion', () => {
        expect(getGenomeImageKind({ kind: 'legion', category: null } as any)).toBe('legion');
        expect(getGenomeImageKind({ kind: undefined, category: 'corps' } as any)).toBe('legion');
        expect(getGenomeImageKind({ kind: undefined, category: 'execution' } as any)).toBe('agent');
    });

    it('returns canonical AgentImage / LegionImage labels and section titles', () => {
        expect(getGenomeImageLabel('agent')).toBe('AgentImage');
        expect(getGenomeImageLabel('legion')).toBe('LegionImage');
        expect(getGenomeImagePluralLabel('agent')).toBe('Agent Images');
        expect(getGenomeImagePluralLabel('legion')).toBe('Legion Images');
        expect(getGenomeImageMirrorTitle('agent')).toBe('view · AgentImage Mirror');
        expect(getGenomeImageMirrorTitle('legion')).toBe('view · LegionImage Mirror');
        expect(getGenomeImageSeedTitle('agent')).toBe('view-not-diff · AgentImage Seed');
        expect(getGenomeImageSeedTitle('legion')).toBe('view-not-diff · LegionImage Seed');
        expect(getGenomeImageSurfaceTitle('agent')).toBe('AgentImage · Package Surface');
        expect(getGenomeImageSurfaceTitle('legion')).toBe('LegionImage · Layer Surface');
    });

    it('builds empty-state copy with canonical naming', () => {
        expect(getGenomeImageEmptyState('agent')).toEqual({
            title: 'No Agent Images found',
            hint: 'Try a different search or category.',
        });
        expect(getGenomeImageEmptyState('legion')).toEqual({
            title: 'No Legion Images found',
            hint: 'Legion Images are multi-agent templates with LegionLayer coordination.',
        });
    });

    it('extracts LegionLayer facts from boot context and task policy', () => {
        const facts = getLegionLayerFacts({
            bootContext: {
                taskPolicy: {
                    boardIsSourceOfTruth: true,
                    requireTaskForExecution: true,
                },
                sharedContext: ['monorepo', 'strict TDD'],
                commandChain: ['master → builder', 'builder → qa'],
                initialObjective: 'Ship a reproducible team package.',
            },
        } as any);

        expect(facts).toEqual([
            { label: 'Initial Objective', value: 'Ship a reproducible team package.' },
            { label: 'Shared Context', value: 'monorepo\nstrict TDD' },
            { label: 'Command Chain', value: 'master → builder\nbuilder → qa' },
            { label: 'Board Source', value: 'Kanban board is source of truth' },
            { label: 'Execution Gate', value: 'Task required for execution' },
        ]);
    });
});
