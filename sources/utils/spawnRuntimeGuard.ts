import type { Session } from '@/sync/storageTypes';

export type RequestedRuntime = 'claude' | 'codex';

export type SpawnRuntimeValidationResult =
    | { ok: true; actualRuntime: RequestedRuntime | null }
    | { ok: false; actualRuntime: RequestedRuntime | null; error: string };

export function normalizeRequestedRuntime(value: unknown): RequestedRuntime | null {
    if (value === 'claude' || value === 'codex') {
        return value;
    }
    return null;
}

export function resolveSessionReportedRuntime(
    session: Pick<Session, 'metadata'> | null | undefined,
): RequestedRuntime | null {
    return normalizeRequestedRuntime(session?.metadata?.flavor);
}

export function validateSpawnedSessionRuntime(
    requestedRuntime: RequestedRuntime,
    session: Pick<Session, 'id' | 'metadata'> | null | undefined,
): SpawnRuntimeValidationResult {
    const actualRuntime = resolveSessionReportedRuntime(session);
    const sessionId = session?.id ?? 'unknown-session';

    if (requestedRuntime === 'codex') {
        if (actualRuntime === 'codex') {
            return { ok: true, actualRuntime };
        }

        if (actualRuntime) {
            return {
                ok: false,
                actualRuntime,
                error: `Session ${sessionId} reported runtime "${actualRuntime}" instead of requested "codex".`,
            };
        }

        return {
            ok: false,
            actualRuntime,
            error: `Session ${sessionId} has not reported a codex runtime yet.`,
        };
    }

    if (actualRuntime === 'codex') {
        return {
            ok: false,
            actualRuntime,
            error: `Session ${sessionId} reported runtime "codex" instead of requested "claude".`,
        };
    }

    return { ok: true, actualRuntime };
}
