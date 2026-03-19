export type StructuredCommerceEventName =
    | 'paywall_entry_clicked'
    | 'paywall_presented'
    | 'paywall_result'
    | 'paywall_error'
    | 'purchase_attempted'
    | 'purchase_completed'
    | 'purchase_failed';

export type StructuredCommerceFlow = 'paywall' | 'direct-purchase';
export type StructuredCommerceProperty = string | number | boolean | null;

export interface StructuredCommerceEventInput {
    name: StructuredCommerceEventName;
    flow: StructuredCommerceFlow;
    surface?: string;
    properties?: Record<string, StructuredCommerceProperty | undefined>;
    occurredAt?: number;
}

export interface StructuredCommerceEventPayload {
    name: StructuredCommerceEventName;
    flow: StructuredCommerceFlow;
    surface?: string;
    platform: string;
    appVersion?: string;
    occurredAt: number;
    properties?: Record<string, StructuredCommerceProperty>;
}

export function normalizeStructuredCommerceString(value: string | undefined, maxLength: number): string | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    return normalized.slice(0, maxLength);
}

export function sanitizeStructuredCommerceProperties(
    properties?: Record<string, StructuredCommerceProperty | undefined>
): Record<string, StructuredCommerceProperty> | undefined {
    if (!properties) {
        return undefined;
    }

    const entries: Array<[string, StructuredCommerceProperty]> = [];
    for (const [key, value] of Object.entries(properties)) {
        const normalizedKey = normalizeStructuredCommerceString(key, 64);
        if (!normalizedKey || value === undefined) {
            continue;
        }

        if (typeof value === 'string') {
            entries.push([normalizedKey, value.slice(0, 256)]);
            continue;
        }

        if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            entries.push([normalizedKey, value]);
        }
    }

    if (entries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(entries);
}

export function buildStructuredCommerceEventPayload(
    input: StructuredCommerceEventInput,
    context: { platform: string; appVersion?: string }
): StructuredCommerceEventPayload {
    return {
        name: input.name,
        flow: input.flow,
        surface: normalizeStructuredCommerceString(input.surface, 64),
        platform: normalizeStructuredCommerceString(context.platform, 16) ?? 'unknown',
        appVersion: normalizeStructuredCommerceString(context.appVersion, 64),
        occurredAt: input.occurredAt ?? Date.now(),
        properties: sanitizeStructuredCommerceProperties(input.properties),
    };
}
