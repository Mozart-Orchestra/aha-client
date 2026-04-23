export const AHA_TRACE_HEADERS = {
    traceId: 'x-aha-trace-id',
    spanId: 'x-aha-span-id',
    parentSpanId: 'x-aha-parent-span-id',
    requestId: 'x-aha-request-id',
    sessionId: 'x-aha-session-id',
    machineId: 'x-aha-machine-id',
    teamId: 'x-aha-team-id',
    taskId: 'x-aha-task-id',
} as const;

let currentTraceId: string | null = null;

function newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrentAhaTraceId(): string {
    if (!currentTraceId) {
        currentTraceId = newId('trc');
    }
    return currentTraceId;
}

export function resetCurrentAhaTraceId(): string {
    currentTraceId = newId('trc');
    return currentTraceId;
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) {
        return result;
    }

    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        headers.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    if (Array.isArray(headers)) {
        for (const [key, value] of headers) {
            result[key] = value;
        }
        return result;
    }

    for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string') {
            result[key] = value;
        }
    }
    return result;
}

function findHeader(headers: Record<string, string>, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName);
    return entry?.[1];
}

export function withAhaTraceHeaders(headers?: HeadersInit, context?: {
    traceId?: string | null;
    parentSpanId?: string | null;
    requestId?: string | null;
    sessionId?: string | null;
    machineId?: string | null;
    teamId?: string | null;
    taskId?: string | null;
}): Record<string, string> {
    const merged = headersToRecord(headers);
    const traceId = context?.traceId?.trim()
        || findHeader(merged, AHA_TRACE_HEADERS.traceId)
        || getCurrentAhaTraceId();
    const requestId = context?.requestId?.trim()
        || findHeader(merged, AHA_TRACE_HEADERS.requestId)
        || newId('req');
    const spanId = findHeader(merged, AHA_TRACE_HEADERS.spanId) || newId('spn');

    return {
        ...merged,
        [AHA_TRACE_HEADERS.traceId]: traceId,
        [AHA_TRACE_HEADERS.spanId]: spanId,
        ...(context?.parentSpanId ? { [AHA_TRACE_HEADERS.parentSpanId]: context.parentSpanId } : {}),
        [AHA_TRACE_HEADERS.requestId]: requestId,
        ...(context?.sessionId ? { [AHA_TRACE_HEADERS.sessionId]: context.sessionId } : {}),
        ...(context?.machineId ? { [AHA_TRACE_HEADERS.machineId]: context.machineId } : {}),
        ...(context?.teamId ? { [AHA_TRACE_HEADERS.teamId]: context.teamId } : {}),
        ...(context?.taskId ? { [AHA_TRACE_HEADERS.taskId]: context.taskId } : {}),
    };
}
