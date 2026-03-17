import { describe, expect, it } from 'vitest';

import type { Message } from '@/sync/typesMessage';

import { getModifiedFileCount, getModifiedFilePaths } from './sessionModifiedFiles';

const createToolMessage = (overrides: Partial<Message & { tool: any }> = {}): Message => ({
    kind: 'tool-call',
    id: overrides.id || 'msg-1',
    localId: null,
    createdAt: 1000,
    children: [],
    tool: {
        name: 'Edit',
        state: 'completed',
        input: { file_path: '/tmp/example.ts' },
        createdAt: 1000,
        startedAt: 1000,
        completedAt: 1100,
        description: null,
        ...(overrides as any).tool,
    },
});

describe('sessionModifiedFiles', () => {
    it('extracts unique file paths from mutable edit/write tools', () => {
        const messages: Message[] = [
            createToolMessage({ id: '1', tool: { name: 'Edit', input: { file_path: '/a.ts' } } }),
            createToolMessage({ id: '2', tool: { name: 'Write', input: { file_path: '/b.ts' } } }),
            createToolMessage({ id: '3', tool: { name: 'MultiEdit', input: { file_path: '/a.ts' } } }),
            createToolMessage({ id: '4', tool: { name: 'NotebookEdit', input: { notebook_path: '/notes.ipynb' } } }),
        ];

        expect(getModifiedFilePaths(messages)).toEqual(['/a.ts', '/b.ts', '/notes.ipynb']);
        expect(getModifiedFileCount(messages)).toBe(3);
    });

    it('ignores errored or denied tool calls', () => {
        const messages: Message[] = [
            createToolMessage({ id: '1', tool: { state: 'error', input: { file_path: '/a.ts' } } }),
            createToolMessage({ id: '2', tool: { permission: { id: 'x', status: 'denied' }, input: { file_path: '/b.ts' } } }),
            createToolMessage({ id: '3', tool: { input: { file_path: '/c.ts' } } }),
        ];

        expect(getModifiedFilePaths(messages)).toEqual(['/c.ts']);
    });

    it('ignores unrelated tools and messages without paths', () => {
        const messages: Message[] = [
            createToolMessage({ id: '1', tool: { name: 'Bash', input: { command: 'ls' } } }),
            createToolMessage({ id: '2', tool: { name: 'Write', input: {} } }),
            {
                kind: 'agent-text',
                id: '3',
                localId: null,
                createdAt: 1000,
                text: 'hello',
            },
        ];

        expect(getModifiedFileCount(messages)).toBe(0);
    });
});
