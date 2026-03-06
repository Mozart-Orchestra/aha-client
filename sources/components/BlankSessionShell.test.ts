import { describe, expect, it } from 'vitest';
import { buildBlankSessionDraft, getBlankSessionLaunchContext } from './blankSessionShell.utils';

describe('buildBlankSessionDraft', () => {
    it('trims prompt and role when preparing a draft for /new', () => {
        expect(buildBlankSessionDraft('  Investigate the failing sync job  ', '  reviewer  ')).toEqual({
            prompt: 'Investigate the failing sync job',
            sessionRole: 'reviewer',
            machineId: undefined,
            path: undefined,
            agentType: undefined,
            sessionType: undefined,
            sessionName: undefined,
        });
    });

    it('drops empty prompt and role values', () => {
        expect(buildBlankSessionDraft('   ', '   ')).toEqual({
            prompt: undefined,
            sessionRole: undefined,
            machineId: undefined,
            path: undefined,
            agentType: undefined,
            sessionType: undefined,
            sessionName: undefined,
        });
    });

    it('forwards remote launch context into the new-session draft', () => {
        expect(buildBlankSessionDraft(' Review this PR ', ' reviewer ', {
            machineId: 'machine-1',
            path: '/workspace/app',
            agentType: 'codex',
            sessionType: 'simple',
            sessionName: 'Reviewer',
        })).toEqual({
            prompt: 'Review this PR',
            sessionRole: 'reviewer',
            machineId: 'machine-1',
            path: '/workspace/app',
            agentType: 'codex',
            sessionType: 'simple',
            sessionName: 'Reviewer',
        });
    });
});

describe('getBlankSessionLaunchContext', () => {
    it('prefers the most recent available machine and agent defaults', () => {
        const machines = [
            {
                id: 'machine-1',
                seq: 1,
                createdAt: 1,
                updatedAt: 1,
                active: true,
                activeAt: 1,
                metadata: {
                    host: 'builder.local',
                    displayName: 'Builder',
                    homeDir: '/Users/builder',
                },
                metadataVersion: 1,
                daemonState: null,
                daemonStateVersion: 1,
            },
        ];

        expect(getBlankSessionLaunchContext({
            machines,
            recentMachinePaths: [{ machineId: 'machine-1', path: '/Users/builder/project' }],
            lastUsedAgent: 'codex',
        })).toEqual({
            machineId: 'machine-1',
            machineName: 'Builder',
            machineHomeDir: '/Users/builder',
            machineOnline: true,
            path: '/Users/builder/project',
            agentType: 'codex',
            sessionType: 'simple',
        });
    });
});
