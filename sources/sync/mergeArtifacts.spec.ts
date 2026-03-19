import { describe, expect, it } from 'vitest';
import { mergeArtifact } from './mergeArtifacts';
import type { DecryptedArtifact } from './artifactTypes';

const existingArtifact: DecryptedArtifact = {
    id: 'team-1',
    title: 'Backend Team',
    type: 'team',
    sessions: ['session-1'],
    draft: false,
    body: '{"tasks":[{"id":"task-1","status":"done"}]}',
    headerVersion: 2,
    bodyVersion: 7,
    seq: 10,
    createdAt: 1,
    updatedAt: 2,
    isDecrypted: true,
};

describe('mergeArtifact', () => {
    it('preserves the cached body when a header-only sync omits it', () => {
        const merged = mergeArtifact(existingArtifact, {
            ...existingArtifact,
            title: 'Backend Team',
            body: undefined,
            bodyVersion: undefined,
            headerVersion: 3,
            seq: 11,
            updatedAt: 3,
        });

        expect(merged.body).toBe(existingArtifact.body);
        expect(merged.bodyVersion).toBe(existingArtifact.bodyVersion);
        expect(merged.headerVersion).toBe(3);
        expect(merged.seq).toBe(11);
    });

    it('applies fresh body data when a full artifact fetch returns it', () => {
        const merged = mergeArtifact(existingArtifact, {
            ...existingArtifact,
            body: '{"tasks":[{"id":"task-2","status":"todo"}]}',
            bodyVersion: 8,
            updatedAt: 4,
        });

        expect(merged.body).toContain('task-2');
        expect(merged.bodyVersion).toBe(8);
        expect(merged.updatedAt).toBe(4);
    });
});
