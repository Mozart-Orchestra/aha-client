import { describe, expect, it } from 'vitest';

import {
    describeGenomeDiffChange,
    getGenomeVersionIdentity,
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
});
