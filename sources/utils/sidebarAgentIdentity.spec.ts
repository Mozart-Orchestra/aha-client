import { describe, expect, it } from 'vitest';

import {
    isRuntimeFlavor,
    resolveSidebarAgentImageRef,
    resolveSidebarAgentIdentity,
    resolveSidebarGenomeRoleCandidates,
} from './sidebarAgentIdentity';

describe('sidebarAgentIdentity', () => {
    it('treats claude and codex as runtime flavors instead of role ids', () => {
        expect(isRuntimeFlavor('claude')).toBe(true);
        expect(isRuntimeFlavor('codex')).toBe(true);
        expect(isRuntimeFlavor('master')).toBe(false);
    });

    it('prefers explicit role metadata over runtime flavor', () => {
        expect(resolveSidebarAgentIdentity({
            sessionRole: 'master',
            sessionFlavor: 'claude',
        })).toEqual({
            roleKey: 'master',
            displayRole: 'master',
            runtimeLabel: 'claude',
        });
    });

    it('does not emit a role key when only runtime flavor is present', () => {
        expect(resolveSidebarAgentIdentity({
            sessionFlavor: 'claude',
        })).toEqual({
            roleKey: '',
            displayRole: 'claude',
            runtimeLabel: 'claude',
        });
    });

    it('prefers explicit team image ids over session metadata ids', () => {
        expect(resolveSidebarAgentImageRef({
            member: {
                sourceImageId: 'genome-from-member',
                sourceImageVersion: 3,
                genomeId: 'legacy-member-genome',
                specId: 'legacy-member-spec',
            },
            session: {
                metadata: {
                    sourceImageId: 'genome-from-session',
                    sourceImageVersion: 1,
                } as any,
            },
        })).toEqual({
            id: 'genome-from-member',
            version: 3,
        });
    });

    it('falls back to session metadata image ids when the roster member lacks them', () => {
        expect(resolveSidebarAgentImageRef({
            member: null,
            session: {
                metadata: {
                    genomeId: 'legacy-session-genome',
                    genomeVersion: 2,
                } as any,
            },
        })).toEqual({
            id: 'legacy-session-genome',
            version: 2,
        });
    });

    it('maps gstack and legacy role ids to canonical genome candidates', () => {
        expect(resolveSidebarGenomeRoleCandidates('product-strategist')).toEqual([
            'product-strategist',
            'gstack-product-strategist',
        ]);
        expect(resolveSidebarGenomeRoleCandidates('builder')).toEqual([
            'builder',
            'implementer',
        ]);
    });

    it('skips unsupported legacy roles instead of forcing guaranteed 404 lookups', () => {
        expect(resolveSidebarGenomeRoleCandidates('level-design')).toEqual([]);
    });
});
