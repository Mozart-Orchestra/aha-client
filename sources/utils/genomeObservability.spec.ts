import { describe, expect, it } from 'vitest';

import {
    describeGenomeLedgerEntry,
    describeGenomeDiffChange,
    getGenomeClosureState,
    getGenomeEnvDeclaration,
    getGenomeHookDisplay,
    getGenomeInlineFileEntries,
    getGenomeLedgerEntryKindLabel,
    getGenomeReplayAlignment,
    getGenomeMcpServerList,
    getGenomeSkillEntries,
    getGenomeVersionIdentity,
    getGenomeWorkspaceConfig,
    parseGenomeDiffChanges,
    stringifyGenomeSpec,
} from './genomeObservability';

describe('genomeObservability', () => {
    it('prefers backend version and flags version drift', () => {
        const identity = getGenomeVersionIdentity(
            { version: 4 } as any,
            { version: 2 } as any,
        );

        expect(identity.displayVersion).toBe(4);
        expect(identity.hubVersion).toBe(4);
        expect(identity.specVersion).toBe(2);
        expect(identity.mismatch).toBe(true);
        expect(identity.status).toBe('drift');
    });

    it('normalizes and pretty-prints raw spec json', () => {
        expect(stringifyGenomeSpec('{"role":"builder","version":4}')).toBe('{\n  "role": "builder",\n  "version": 4\n}');
        expect(stringifyGenomeSpec('not-json')).toBe('not-json');
    });

    it('parses heterogeneous diff chains', () => {
        const changes = parseGenomeDiffChanges(JSON.stringify([
            { type: 'kv', path: 'behavior.onIdle', from: 'wait', to: 'ask' },
            { type: 'string', path: 'protocol', op: 'append', content: 'Use kanban first' },
            { type: 'narrative', content: 'Supervisor observed better task hygiene.' },
        ]));

        expect(changes).toHaveLength(3);
        expect(describeGenomeDiffChange(changes[0]!)).toBe('behavior.onIdle: wait → ask');
        expect(describeGenomeDiffChange(changes[1]!)).toBe('append protocol: Use kanban first');
        expect(describeGenomeDiffChange(changes[2]!)).toBe('Supervisor observed better task hygiene.');
    });

    it('drops malformed diff entries instead of throwing', () => {
        expect(() => parseGenomeDiffChanges('{"nope":true}')).toThrow('Genome diff payload must be an array.');
        expect(() => parseGenomeDiffChanges(JSON.stringify([{ type: 'kv', nope: true }]))).toThrow('Genome diff entry 1 has an unsupported shape.');
    });

    it('compares canonical replay output against the current spec', () => {
        const replayAlignment = getGenomeReplayAlignment(
            '{"version":4,"behavior":{"onIdle":"ask"}}',
            '{"behavior":{"onIdle":"ask"},"version":4}',
        );

        expect(replayAlignment).toEqual({
            status: 'aligned',
            available: true,
            matchesCanonical: true,
        });
    });

    it('derives closure state conservatively from ledger, replay, and runtime hints', () => {
        const versionIdentity = getGenomeVersionIdentity(
            { version: 4 } as any,
            { version: 4 } as any,
        );
        const replayAlignment = getGenomeReplayAlignment('{"version":4}', '{"version":4}');
        const closure = getGenomeClosureState({
            versionIdentity,
            diffs: [{ changes: '[]' }] as any,
            ledger: [{ id: 'row-1' }] as any,
            replayAlignment,
            agentStatus: 'active',
            sessionActive: true,
        });

        expect(closure).toEqual({
            controlPlaneClosure: 'established',
            downstreamClosure: 'established',
            replaceStatus: 'verified',
            rosterExitStatus: 'pending',
            behaviorDeltaStatus: 'not-proven',
        });
    });

    it('marks roster exit once the linked runtime has already been archived', () => {
        const closure = getGenomeClosureState({
            versionIdentity: getGenomeVersionIdentity({ version: 3 } as any, { version: 2 } as any),
            diffs: [{ changes: '[]' }] as any,
            agentStatus: 'archived',
            sessionActive: false,
        });

        expect(closure.replaceStatus).toBe('old-session-archived');
        expect(closure.rosterExitStatus).toBe('removed');
    });

    it('describes canonical ledger rows', () => {
        expect(getGenomeLedgerEntryKindLabel({ diffType: 'string' } as any)).toBe('STRING');
        expect(describeGenomeLedgerEntry({
            diffType: 'kv',
            path: 'behavior.onIdle',
            oldValue: '"wait"',
            newValue: '"ask"',
        } as any)).toBe('behavior.onIdle: wait → ask');
    });

    it('reads canonical agent.json package fields for workspace, env, skills, mcp servers, and files', () => {
        const source = {
            kind: 'aha.agent.v1',
            name: 'builder',
            runtime: 'codex',
            tools: {
                skills: ['review', 'lint'],
                mcpServers: ['filesystem'],
            },
            workspace: {
                defaultMode: 'shared',
                allowedModes: ['shared', 'isolated'],
            },
            env: {
                required: ['OPENAI_API_KEY'],
                optional: ['AHA_ROOM_ID'],
            },
            files: {
                '.claude/commands/review': '# Review\nCheck diff first.',
                '.aha-agent/manifest.json': '{"kind":"skill-inline"}',
            },
        };

        expect(getGenomeWorkspaceConfig(source)).toEqual({
            defaultMode: 'shared',
            allowedModes: ['shared', 'isolated'],
        });
        expect(getGenomeEnvDeclaration(source)).toEqual({
            required: ['OPENAI_API_KEY'],
            optional: ['AHA_ROOM_ID'],
            secretsPolicy: [],
        });
        expect(getGenomeMcpServerList(source)).toEqual(['filesystem']);
        expect(getGenomeSkillEntries(source)).toEqual([
            { name: 'review', source: 'inline', inlinePath: '.claude/commands/review' },
            { name: 'lint', source: 'ref' },
        ]);
        expect(getGenomeInlineFileEntries(source)).toEqual([
            {
                path: '.aha-agent/manifest.json',
                preview: '{"kind":"skill-inline"}',
                truncated: false,
                lineCount: 1,
                inlineSkillName: null,
            },
            {
                path: '.claude/commands/review',
                preview: '# Review\nCheck diff first.',
                truncated: false,
                lineCount: 2,
                inlineSkillName: 'review',
            },
        ]);
    });

    it('treats hooks as security-trimmed outside @official and visible for official genomes', () => {
        const source = {
            hooks: {
                preToolUse: [
                    { matcher: 'score_agent', command: 'echo scored', description: 'Score log' },
                ],
            },
        };

        expect(getGenomeHookDisplay(source, '@acme')).toEqual({
            visibility: 'security-trimmed',
            entries: [],
        });
        expect(getGenomeHookDisplay(source, '@official')).toEqual({
            visibility: 'visible',
            entries: [
                {
                    phase: 'preToolUse',
                    matcher: 'score_agent',
                    command: 'echo scored',
                    description: 'Score log',
                },
            ],
        });
    });
});
