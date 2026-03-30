import type {
    GenomeDiffRecord,
    GenomeRecord,
    GenomeSpec,
} from '@/utils/genomeHub';

export interface GenomeVersionIdentity {
    hubVersion: number | null;
    specVersion: number | null;
    displayVersion: number | null;
    mismatch: boolean;
    status: 'aligned' | 'drift' | 'unknown';
}

export type GenomeObservedDiffChange =
    | {
        type: 'kv';
        path: string;
        from?: unknown;
        to: unknown;
    }
    | {
        type: 'string';
        path: string;
        op: 'append' | 'replace' | 'remove';
        content: string;
        from?: string;
    }
    | {
        type: 'narrative';
        content: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function getGenomeVersionIdentity(
    genome?: GenomeRecord | null,
    spec?: GenomeSpec | null,
): GenomeVersionIdentity {
    const hubVersion = typeof genome?.version === 'number' && Number.isFinite(genome.version)
        ? genome.version
        : null;
    const specVersion = typeof spec?.version === 'number' && Number.isFinite(spec.version)
        ? spec.version
        : null;
    const mismatch = hubVersion != null && specVersion != null && hubVersion !== specVersion;
    const displayVersion = hubVersion ?? specVersion;

    return {
        hubVersion,
        specVersion,
        displayVersion,
        mismatch,
        status: mismatch
            ? 'drift'
            : displayVersion != null
                ? 'aligned'
                : 'unknown',
    };
}

export function stringifyGenomeSpec(specText?: string | null): string {
    if (!specText) {
        return '{}';
    }

    try {
        return JSON.stringify(JSON.parse(specText), null, 2);
    } catch {
        return specText;
    }
}

export function parseGenomeDiffChanges(changesText?: string | null): GenomeObservedDiffChange[] {
    if (!changesText) {
        return [];
    }

    const parsed = JSON.parse(changesText);
    if (!Array.isArray(parsed)) {
        throw new Error('Genome diff payload must be an array.');
    }

    return parsed.map((entry, index): GenomeObservedDiffChange => {
        if (!isRecord(entry) || typeof entry.type !== 'string') {
            throw new Error(`Genome diff entry ${index + 1} is invalid.`);
        }

        if (entry.type === 'kv' && typeof entry.path === 'string' && 'to' in entry) {
            return {
                type: 'kv',
                path: entry.path,
                from: entry.from,
                to: entry.to,
            };
        }

        if (
            entry.type === 'string'
            && typeof entry.path === 'string'
            && (entry.op === 'append' || entry.op === 'replace' || entry.op === 'remove')
            && typeof entry.content === 'string'
        ) {
            return {
                type: 'string',
                path: entry.path,
                op: entry.op,
                content: entry.content,
                from: typeof entry.from === 'string' ? entry.from : undefined,
            };
        }

        if (entry.type === 'narrative' && typeof entry.content === 'string') {
            return {
                type: 'narrative',
                content: entry.content,
            };
        }

        throw new Error(`Genome diff entry ${index + 1} has an unsupported shape.`);
    });
}

export function getGenomeDiffRecordChanges(diff: GenomeDiffRecord): GenomeObservedDiffChange[] {
    return parseGenomeDiffChanges(diff.changes);
}

function formatValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (value == null) {
        return 'null';
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export function describeGenomeDiffChange(change: GenomeObservedDiffChange): string {
    if (change.type === 'kv') {
        const prefix = change.from === undefined
            ? `${change.path} → ${formatValue(change.to)}`
            : `${change.path}: ${formatValue(change.from)} → ${formatValue(change.to)}`;
        return prefix;
    }

    if (change.type === 'string') {
        return `${change.op} ${change.path}: ${change.content}`;
    }

    return change.content;
}

export function getGenomeDiffChangeKindLabel(change: GenomeObservedDiffChange): 'KV' | 'STRING' | 'NARRATIVE' {
    if (change.type === 'kv') return 'KV';
    if (change.type === 'string') return 'STRING';
    return 'NARRATIVE';
}
