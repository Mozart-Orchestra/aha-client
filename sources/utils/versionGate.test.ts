import { describe, expect, it } from 'vitest';
import { calculateGateReadiness, summarizeReleaseGates } from './versionGate';

describe('versionGate utils', () => {
    it('marks gate as ready only when three-end checks all pass', () => {
        const result = calculateGateReadiness({
            versionTrack: 'v2',
            branch: 'release/v2-integration',
            completionRule: '同版本分支必须完成三端调试才能关闭分支',
            requiredChecks: [
                { component: 'aha-cli', environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
                { component: 'happy-server', environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
                { component: 'kanban', environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
            ],
        });

        expect(result.total).toBe(3);
        expect(result.passed).toBe(2);
        expect(result.ready).toBe(false);
        expect(result.missing).toEqual(['kanban']);
    });

    it('summarizes multiple gates', () => {
        const summary = summarizeReleaseGates([
            {
                versionTrack: 'v1',
                branch: 'release/v1-integration',
                completionRule: 'rule',
                requiredChecks: [
                    { component: 'aha-cli', environments: ['uv1'], status: 'passed' },
                    { component: 'happy-server', environments: ['uv1'], status: 'passed' },
                    { component: 'kanban', environments: ['uv1'], status: 'passed' },
                ],
            },
            {
                versionTrack: 'v2',
                branch: 'release/v2-integration',
                completionRule: 'rule',
                requiredChecks: [
                    { component: 'aha-cli', environments: ['uv1', 'uv2', 'wow'], status: 'passed' },
                    { component: 'happy-server', environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
                    { component: 'kanban', environments: ['uv1', 'uv2', 'wow'], status: 'pending' },
                ],
            },
        ]);

        expect(summary.totalGates).toBe(2);
        expect(summary.readyGates).toBe(1);
        expect(summary.allReady).toBe(false);
    });
});
