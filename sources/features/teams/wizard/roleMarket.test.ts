import { describe, expect, it } from 'vitest';
import {
    applyRoleMarketInsights,
    buildRecommendedRoleMarketOptions,
    buildRoleMarketOptions,
    buildRoleMarketSkillSuggestions,
    createRoleConfigFromMarketRole,
    filterRoleMarketOptions,
} from './roleMarket';

describe('roleMarket helpers', () => {
    it('keeps built-in roles ahead of remote duplicates', () => {
        const roles = buildRoleMarketOptions({
            builtInRoles: [
                {
                    id: 'builder',
                    title: 'Builder',
                    summary: 'Ships code',
                    responsibilities: [],
                    abilityBoundaries: [],
                    handoffProtocol: [],
                    protocol: [],
                },
            ],
            defaultRoles: [
                {
                    id: 'builder',
                    title: 'Builder Template',
                    summary: 'Duplicate template',
                },
                {
                    id: 'reviewer',
                    title: 'Reviewer',
                    summary: 'Reviews deliveries',
                },
            ],
            customRoles: [],
            publicRoles: [
                {
                    id: 'reviewer',
                    title: 'Reviewer Pool',
                    summary: 'Duplicate pool role',
                    visibility: 'public',
                    ownerId: 'owner-1',
                    publishedAt: 1,
                    stats: {
                        reviewCount: 4,
                        completionCount: 2,
                        totalRating: 16,
                        averageRating: 4,
                        cumulativeCode: 0,
                        cumulativeQuality: 0,
                        sourceScoreTotals: { user: 0, master: 0, system: 0 },
                    },
                },
            ],
        });

        expect(roles).toHaveLength(2);
        expect(roles[0]).toMatchObject({ id: 'builder', source: 'built-in' });
        expect(roles[1]).toMatchObject({ id: 'reviewer', source: 'default' });
    });

    it('filters by title, skill tag, and stats', () => {
        const roles = [
            {
                id: 'reviewer',
                title: 'Reviewer',
                summary: 'Focuses on review quality',
                source: 'public' as const,
                assignedSkills: ['code-review', 'qa'],
                stats: {
                    reviewCount: 18,
                    completionCount: 0,
                    totalRating: 81,
                    averageRating: 4.5,
                    cumulativeCode: 0,
                    cumulativeQuality: 0,
                    sourceScoreTotals: { user: 0, master: 0, system: 0 },
                },
            },
            {
                id: 'builder',
                title: 'Builder',
                summary: 'Writes product code',
                source: 'built-in' as const,
            },
        ];

        expect(filterRoleMarketOptions(roles, 'review')).toHaveLength(1);
        expect(filterRoleMarketOptions(roles, '#qa')).toHaveLength(1);
        expect(filterRoleMarketOptions(roles, '4.5')).toHaveLength(1);
        expect(filterRoleMarketOptions(roles, 'missing')).toHaveLength(0);
    });

    it('builds skill suggestions and role config defaults', () => {
        const skills = buildRoleMarketSkillSuggestions([
            {
                id: 'builder',
                title: 'Builder',
                summary: 'Builds features',
                source: 'built-in',
                assignedSkills: ['typescript', 'react'],
            },
            {
                id: 'reviewer',
                title: 'Reviewer',
                summary: 'Checks work',
                source: 'public',
                assignedSkills: ['react', 'qa'],
            },
        ]);

        expect(skills[0]).toBe('react');

        const config = createRoleConfigFromMarketRole(
            {
                id: 'reviewer',
                title: 'Reviewer',
                summary: 'Checks work',
                source: 'public',
                assignedSkills: ['qa'],
            },
            'machine-1'
        );

        expect(config.roleId).toBe('reviewer');
        expect(config.mode).toBe('claude-code');
        expect(config.machineId).toBe('machine-1');
        expect(config.skills).toEqual(['qa']);
    });

    it('applies canonical market insights and surfaces top recommendations', () => {
        const baseRoles = buildRoleMarketOptions({
            builtInRoles: [],
            defaultRoles: [
                {
                    id: 'builder',
                    title: 'Builder',
                    summary: 'Builds core product code',
                },
            ],
            customRoles: [
                {
                    id: 'reviewer',
                    title: 'Reviewer',
                    summary: 'Reviews work',
                    visibility: 'public',
                    ownerId: 'user-1',
                    publishedAt: Date.now(),
                    stats: {
                        reviewCount: 5,
                        completionCount: 3,
                        totalRating: 22,
                        averageRating: 4.4,
                        cumulativeCode: 12,
                        cumulativeQuality: 45,
                        sourceScoreTotals: { user: 0, master: 0, system: 0 },
                    },
                },
            ],
            publicRoles: [],
        });

        const withInsights = applyRoleMarketInsights(baseRoles, [
            {
                id: 'reviewer',
                title: 'Reviewer',
                summary: 'Reviews work with quality guardrails',
                source: 'custom',
                assignedSkills: ['qa', 'review'],
                score: 87.5,
                why: ['Matches quality goals.', '4.4★ from 5 reviews.'],
                goalMatches: ['quality'],
                variant: {
                    id: 'custom:reviewer',
                    label: 'Workspace variant',
                    source: 'workspace-custom',
                    detail: 'Published from your workspace.',
                },
                access: {
                    key: 'workspace-shared',
                    label: 'My published role',
                },
                stats: {
                    reviewCount: 5,
                    completionCount: 3,
                    totalRating: 22,
                    averageRating: 4.4,
                    cumulativeCode: 12,
                    cumulativeQuality: 45,
                    sourceScoreTotals: { user: 0, master: 0, system: 0 },
                },
            },
        ]);

        expect(withInsights[1]?.market?.score).toBe(87.5);
        expect(withInsights[1]?.market?.goalMatches).toEqual(['quality']);
        expect(withInsights[1]?.assignedSkills).toEqual(['qa', 'review']);

        const recommended = buildRecommendedRoleMarketOptions(withInsights, [], 1);
        expect(recommended).toHaveLength(1);
        expect(recommended[0]?.id).toBe('reviewer');
        expect(recommended[0]?.market?.access.label).toBe('My published role');
    });
});
