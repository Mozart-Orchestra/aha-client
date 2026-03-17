import type { Message } from '@/sync/typesMessage';

const MODIFICATION_TOOL_NAMES = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);

function getModifiedFilePath(message: Message): string | null {
    if (message.kind !== 'tool-call') {
        return null;
    }

    const { tool } = message;
    if (!MODIFICATION_TOOL_NAMES.has(tool.name)) {
        return null;
    }

    if (tool.state === 'error' || tool.permission?.status === 'denied' || tool.permission?.status === 'canceled') {
        return null;
    }

    const filePath = typeof tool.input?.file_path === 'string' ? tool.input.file_path.trim() : '';
    if (filePath) {
        return filePath;
    }

    const notebookPath = typeof tool.input?.notebook_path === 'string' ? tool.input.notebook_path.trim() : '';
    if (notebookPath) {
        return notebookPath;
    }

    return null;
}

export function getModifiedFilePaths(messages: Message[]): string[] {
    const uniquePaths = new Set<string>();

    messages.forEach((message) => {
        const path = getModifiedFilePath(message);
        if (path) {
            uniquePaths.add(path);
        }
    });

    return [...uniquePaths];
}

export function getModifiedFileCount(messages: Message[]): number {
    return getModifiedFilePaths(messages).length;
}
