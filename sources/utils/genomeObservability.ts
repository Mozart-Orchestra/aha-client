import type {
    AgentImage,
    AgentPlug,
    DiffLedgerEntry,
    GenomeRecord,
} from '@/utils/genomeHub';

type GenomeObservableInput = AgentImage | Record<string, unknown> | null | undefined;

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

export interface GenomeObservedWorkspaceConfig {
    defaultMode: string | null;
    allowedModes: string[];
}

export interface GenomeObservedEnvDeclaration {
    required: string[];
    optional: string[];
    secretsPolicy: string[];
}

export interface GenomeObservedInlineFileEntry {
    path: string;
    preview: string;
    truncated: boolean;
    lineCount: number;
    inlineSkillName: string | null;
}

export interface GenomeObservedSkillEntry {
    name: string;
    source: 'inline' | 'ref';
    inlinePath?: string;
}

export interface GenomeObservedHookEntry {
    phase: 'preToolUse' | 'postToolUse' | 'stop';
    matcher?: string;
    command: string;
    description?: string;
}

export interface GenomeObservedHookDisplay {
    visibility: 'visible' | 'security-trimmed' | 'absent';
    entries: GenomeObservedHookEntry[];
}

export interface GenomeReplayAlignment {
    status: 'aligned' | 'drift' | 'unavailable';
    available: boolean;
    matchesCanonical: boolean;
}

export interface GenomeClosureState {
    controlPlaneClosure: 'open' | 'established';
    downstreamClosure: 'open' | 'partial' | 'established';
    replaceStatus: 'not-started' | 'spawned' | 'tasks-migrated' | 'old-session-archived' | 'verified';
    rosterExitStatus: 'unknown' | 'pending' | 'removed';
    behaviorDeltaStatus: 'unknown' | 'not-proven' | 'proven';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function uniqueStrings(values: unknown[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        result.push(trimmed);
    }

    return result;
}

function getObservableRecord(source: GenomeObservableInput): Record<string, unknown> | null {
    return isRecord(source) ? source : null;
}

function getNestedRecord(source: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
    if (!source) return null;
    const value = source[key];
    return isRecord(value) ? value : null;
}

function getNestedStringArray(source: Record<string, unknown> | null, key: string): string[] {
    if (!source) return [];
    const value = source[key];
    return Array.isArray(value) ? uniqueStrings(value) : [];
}

function getFilesRecord(source: GenomeObservableInput): Record<string, string> {
    const record = getObservableRecord(source);
    const files = getNestedRecord(record, 'files');
    if (!files) return {};

    return Object.fromEntries(
        Object.entries(files).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
}

function inferInlineSkillName(path: string): string | null {
    const normalized = path.replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)(?:\.claude\/)?commands\/([^/]+)$/i);
    if (!match) return null;
    const rawName = match[1] ?? '';
    const withoutExtension = rawName.replace(/\.[^.]+$/, '');
    return withoutExtension || rawName || null;
}

function buildFilePreview(content: string): { preview: string; truncated: boolean; lineCount: number } {
    const lines = content.split('\n');
    const maxLines = 12;
    const maxChars = 1200;
    const visibleLines = lines.slice(0, maxLines);
    let preview = visibleLines.join('\n');
    let truncated = lines.length > maxLines;

    if (preview.length > maxChars) {
        preview = `${preview.slice(0, maxChars).trimEnd()}…`;
        truncated = true;
    }

    return {
        preview,
        truncated,
        lineCount: lines.length,
    };
}

export function getGenomeVersionIdentity(
    genome?: GenomeRecord | null,
    spec?: AgentImage | null,
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

export function getAgentPlugChanges(diff: AgentPlug): GenomeObservedDiffChange[] {
    return parseGenomeDiffChanges(diff.changes);
}

export const getAgentPlugRecordChanges = getAgentPlugChanges;

export function getGenomeWorkspaceConfig(source: GenomeObservableInput): GenomeObservedWorkspaceConfig | null {
    const record = getObservableRecord(source);
    const workspace = getNestedRecord(record, 'workspace');
    if (!workspace) {
        return null;
    }

    return {
        defaultMode: typeof workspace.defaultMode === 'string' ? workspace.defaultMode : null,
        allowedModes: getNestedStringArray(workspace, 'allowedModes'),
    };
}

export function getGenomeEnvDeclaration(source: GenomeObservableInput): GenomeObservedEnvDeclaration | null {
    const record = getObservableRecord(source);
    const env = getNestedRecord(record, 'env');
    if (!env) {
        return null;
    }

    return {
        required: uniqueStrings([
            ...getNestedStringArray(env, 'required'),
            ...getNestedStringArray(env, 'requiredEnv'),
        ]),
        optional: uniqueStrings([
            ...getNestedStringArray(env, 'optional'),
            ...getNestedStringArray(env, 'optionalEnv'),
        ]),
        secretsPolicy: getNestedStringArray(env, 'secretsPolicy'),
    };
}

export function getGenomeInlineFileEntries(source: GenomeObservableInput): GenomeObservedInlineFileEntry[] {
    return Object.entries(getFilesRecord(source))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([path, content]) => {
            const preview = buildFilePreview(content);
            return {
                path,
                preview: preview.preview,
                truncated: preview.truncated,
                lineCount: preview.lineCount,
                inlineSkillName: inferInlineSkillName(path),
            };
        });
}

export function getGenomeMcpServerList(source: GenomeObservableInput): string[] {
    const record = getObservableRecord(source);
    const tools = getNestedRecord(record, 'tools');

    return uniqueStrings([
        ...getNestedStringArray(record, 'mcpServers'),
        ...getNestedStringArray(tools, 'mcpServers'),
    ]);
}

export function getGenomeSkillEntries(source: GenomeObservableInput): GenomeObservedSkillEntry[] {
    const record = getObservableRecord(source);
    const tools = getNestedRecord(record, 'tools');
    const explicitSkills = uniqueStrings([
        ...getNestedStringArray(record, 'skills'),
        ...getNestedStringArray(tools, 'skills'),
    ]);

    const inlineSkillMap = new Map<string, string>();
    for (const file of getGenomeInlineFileEntries(source)) {
        if (!file.inlineSkillName) continue;
        inlineSkillMap.set(file.inlineSkillName, file.path);
    }

    const result: GenomeObservedSkillEntry[] = explicitSkills.map((name) => {
        const inlinePath = inlineSkillMap.get(name);
        return inlinePath
            ? { name, source: 'inline', inlinePath }
            : { name, source: 'ref' };
    });

    for (const [name, inlinePath] of inlineSkillMap.entries()) {
        if (explicitSkills.includes(name)) continue;
        result.push({ name, source: 'inline', inlinePath });
    }

    return result;
}

export function getGenomeHookDisplay(
    source: GenomeObservableInput,
    namespace?: string | null,
): GenomeObservedHookDisplay {
    if ((namespace ?? '').trim().toLowerCase() !== '@official') {
        return {
            visibility: 'security-trimmed',
            entries: [],
        };
    }

    const record = getObservableRecord(source);
    const hooks = getNestedRecord(record, 'hooks');
    if (!hooks) {
        return {
            visibility: 'absent',
            entries: [],
        };
    }

    const entries: GenomeObservedHookEntry[] = [];
    for (const phase of ['preToolUse', 'postToolUse', 'stop'] as const) {
        const rawEntries = hooks[phase];
        if (!Array.isArray(rawEntries)) continue;
        for (const entry of rawEntries) {
            if (!isRecord(entry) || typeof entry.command !== 'string') continue;
            entries.push({
                phase,
                matcher: typeof entry.matcher === 'string' ? entry.matcher : undefined,
                command: entry.command,
                description: typeof entry.description === 'string' ? entry.description : undefined,
            });
        }
    }

    return {
        visibility: entries.length > 0 ? 'visible' : 'absent',
        entries,
    };
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

function formatStoredValue(value?: string | null): string {
    if (value == null || value === '') {
        return '—';
    }

    try {
        return formatValue(JSON.parse(value));
    } catch {
        return value;
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

export function describeGenomeLedgerEntry(entry: DiffLedgerEntry): string {
    if (entry.diffType === 'kv') {
        const path = entry.path ? `${entry.path}: ` : '';
        return `${path}${formatStoredValue(entry.oldValue)} → ${formatStoredValue(entry.newValue)}`;
    }

    if (entry.diffType === 'string') {
        return `${entry.op ?? 'append'} ${entry.path ?? '(pathless)'}: ${entry.content ?? formatStoredValue(entry.newValue)}`;
    }

    return entry.content ?? 'Narrative context recorded.';
}

export function getGenomeLedgerEntryKindLabel(entry: DiffLedgerEntry): 'KV' | 'STRING' | 'NARRATIVE' {
    if (entry.diffType === 'kv') return 'KV';
    if (entry.diffType === 'string') return 'STRING';
    return 'NARRATIVE';
}

function normalizeJsonText(specText?: string | null): string | null {
    if (!specText) {
        return null;
    }

    try {
        const normalizeJsonValue = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(normalizeJsonValue);
            }
            if (isRecord(value)) {
                return Object.fromEntries(
                    Object.keys(value)
                        .sort((left, right) => left.localeCompare(right))
                        .map((key) => [key, normalizeJsonValue(value[key])]),
                );
            }
            return value;
        };

        return JSON.stringify(normalizeJsonValue(JSON.parse(specText)));
    } catch {
        return specText.trim();
    }
}

export function getGenomeReplayAlignment(
    canonicalSpec?: string | null,
    replayedSpec?: string | null,
): GenomeReplayAlignment {
    const canonical = normalizeJsonText(canonicalSpec);
    const replayed = normalizeJsonText(replayedSpec);

    if (!canonical || !replayed) {
        return {
            status: 'unavailable',
            available: false,
            matchesCanonical: false,
        };
    }

    const matchesCanonical = canonical === replayed;
    return {
        status: matchesCanonical ? 'aligned' : 'drift',
        available: true,
        matchesCanonical,
    };
}

export function getGenomeClosureState(input: {
    versionIdentity: GenomeVersionIdentity;
    diffs?: AgentPlug[];
    ledger?: DiffLedgerEntry[];
    replayAlignment?: GenomeReplayAlignment | null;
    agentStatus?: 'active' | 'paused' | 'archived' | 'pending' | 'failed' | null;
    sessionActive?: boolean | null;
}): GenomeClosureState {
    const {
        versionIdentity,
        diffs = [],
        ledger = [],
        replayAlignment,
        agentStatus = null,
        sessionActive = null,
    } = input;

    const hasControlPlaneEvidence = diffs.length > 0
        || ledger.length > 0
        || (versionIdentity.hubVersion ?? 0) > 1;
    const replayAligned = replayAlignment?.status === 'aligned';
    const versionAligned = versionIdentity.status === 'aligned';

    let downstreamClosure: GenomeClosureState['downstreamClosure'] = 'open';
    if (hasControlPlaneEvidence && replayAligned && versionAligned) {
        downstreamClosure = 'established';
    } else if (hasControlPlaneEvidence && (replayAlignment?.available || versionAligned || ledger.length > 0)) {
        downstreamClosure = 'partial';
    }

    let replaceStatus: GenomeClosureState['replaceStatus'] = 'not-started';
    if (hasControlPlaneEvidence) {
        replaceStatus = downstreamClosure === 'established' ? 'verified' : 'spawned';
        if (agentStatus === 'archived' || sessionActive === false) {
            replaceStatus = 'old-session-archived';
        }
    }

    const rosterExitStatus: GenomeClosureState['rosterExitStatus'] = agentStatus === 'archived' || sessionActive === false
        ? 'removed'
        : hasControlPlaneEvidence
            ? 'pending'
            : 'unknown';

    return {
        controlPlaneClosure: hasControlPlaneEvidence ? 'established' : 'open',
        downstreamClosure,
        replaceStatus,
        rosterExitStatus,
        behaviorDeltaStatus: hasControlPlaneEvidence ? 'not-proven' : 'unknown',
    };
}
