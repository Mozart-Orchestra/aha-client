import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('storage applyNewMessageAtomic implementation', () => {
    it('keeps raw count, session patch, and message append in a single atomic set() block', () => {
        const source = readFileSync(join(process.cwd(), 'sources/sync/storage.ts'), 'utf8');
        const start = source.lastIndexOf('applyNewMessageAtomic:');
        const end = source.indexOf('applyMessagesLoaded:', start);

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);

        const methodSource = source.slice(start, end);

        expect((methodSource.match(/\bset\s*\(/g) ?? []).length).toBe(1);
        expect(methodSource).toContain('rawCount');
        expect(methodSource).toContain('persistedMessageCount');
        expect(methodSource).toContain('sessionPatch');
        expect(methodSource).toContain('messagesMap');
        expect(methodSource).toContain('sessionMessages');
        expect(methodSource).toContain('sessions: updatedSessions');
    });
});
