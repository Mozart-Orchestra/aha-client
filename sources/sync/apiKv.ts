import type { AuthCredentials } from '@/auth/tokenStorage';
import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { backoff } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
import { getServerUrl } from './serverConfig';

export interface KvItem {
    key: string;
    value: string;
    version: number;
}

export interface KvMutation {
    key: string;
    value: string | null;
    version: number;
}

export interface KvListParams {
    prefix?: string;
    limit?: number;
}

export interface KvListResponse {
    items: KvItem[];
}

export interface KvBulkGetRequest {
    keys: string[];
}

export interface KvBulkGetResponse {
    values: KvItem[];
}

export interface KvMutateRequest {
    mutations: KvMutation[];
}

export interface KvMutateSuccessResponse {
    success: true;
    results: Array<{
        key: string;
        version: number;
    }>;
}

export interface KvMutateErrorResponse {
    success: false;
    errors: Array<{
        key: string;
        error: string;
        version: number;
        value: string | null;
    }>;
}

export type KvMutateResponse = KvMutateSuccessResponse | KvMutateErrorResponse;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function decodeKvValue(value: string): string {
    return textDecoder.decode(decodeBase64(value));
}

function encodeKvValue(value: string): string {
    return encodeBase64(textEncoder.encode(value), 'base64');
}

function decodeKvItem(item: { key: string; value: string; version: number }): KvItem {
    return {
        ...item,
        value: decodeKvValue(item.value),
    };
}

function decodeKvMutateError(
    error: { key: string; error: string; version: number; value: string | null },
): { key: string; error: string; version: number; value: string | null } {
    return {
        ...error,
        value: error.value === null ? null : decodeKvValue(error.value),
    };
}

export async function getKV(
    credentials: AuthCredentials,
    key: string,
): Promise<KvItem | null> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/kv/${encodeURIComponent(key)}`, {
            headers: { 'Authorization': `Bearer ${credentials.token}` },
        });
        checkAuth(response, credentials.token);

        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`Failed to get KV value: ${response.status}`);
        }

        const data = await response.json() as { key: string; value: string; version: number };
        return decodeKvItem(data);
    });
}

export async function kvList(
    credentials: AuthCredentials,
    params: KvListParams = {},
): Promise<KvListResponse> {
    const API_ENDPOINT = getServerUrl();
    const queryParams = new URLSearchParams();

    if (params.prefix) {
        queryParams.append('prefix', params.prefix);
    }
    if (params.limit !== undefined) {
        queryParams.append('limit', String(params.limit));
    }

    const suffix = queryParams.toString() ? `?${queryParams}` : '';

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/kv${suffix}`, {
            headers: { 'Authorization': `Bearer ${credentials.token}` },
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to list KV values: ${response.status}`);
        }

        const data = await response.json() as {
            items: Array<{ key: string; value: string; version: number }>;
        };

        return { items: (data.items ?? []).map(decodeKvItem) };
    });
}

export async function mutateKV(
    credentials: AuthCredentials,
    mutations: KvMutation[],
): Promise<KvMutateResponse> {
    if (mutations.length === 0) {
        return { success: true, results: [] };
    }

    if (mutations.length > 100) {
        throw new Error('Cannot mutate more than 100 keys at once');
    }

    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/kv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mutations: mutations.map((mutation) => ({
                    ...mutation,
                    value: mutation.value === null
                        ? null
                        : encodeKvValue(mutation.value),
                })),
            }),
        });
        checkAuth(response, credentials.token);

        if (response.status === 409) {
            const data = await response.json() as {
                success: false;
                errors: Array<{ key: string; error: string; version: number; value: string | null }>;
            };
            return {
                success: false,
                errors: data.errors.map(decodeKvMutateError),
            };
        }

        if (!response.ok) {
            throw new Error(`Failed to mutate KV values: ${response.status}`);
        }

        return await response.json() as KvMutateSuccessResponse;
    });
}

export async function kvBulkGet(
    credentials: AuthCredentials,
    keys: string[],
): Promise<KvBulkGetResponse> {
    if (keys.length === 0) {
        return { values: [] };
    }

    if (keys.length > 100) {
        throw new Error('Cannot bulk get more than 100 keys at once');
    }

    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/kv/bulk`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ keys }),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to bulk get KV values: ${response.status}`);
        }

        const data = await response.json() as {
            values: Array<{ key: string; value: string; version: number }>;
        };
        return {
            values: (data.values ?? []).map(decodeKvItem),
        };
    });
}

export async function kvSet(
    credentials: AuthCredentials,
    key: string,
    value: string,
    version: number = -1,
): Promise<number> {
    const result = await mutateKV(credentials, [{
        key,
        value,
        version,
    }]);

    if (!result.success) {
        const error = result.errors[0];
        throw new Error(`Failed to set key "${key}": ${error.error} (current version: ${error.version})`);
    }

    return result.results[0].version;
}

export async function kvDelete(
    credentials: AuthCredentials,
    key: string,
    version: number,
): Promise<void> {
    const result = await mutateKV(credentials, [{
        key,
        value: null,
        version,
    }]);

    if (!result.success) {
        const error = result.errors[0];
        throw new Error(`Failed to delete key "${key}": ${error.error} (current version: ${error.version})`);
    }
}

export async function kvGetByPrefix(
    credentials: AuthCredentials,
    prefix: string,
    limit: number = 100,
): Promise<KvItem[]> {
    const response = await kvList(credentials, { prefix, limit });
    return response.items;
}

export const kvGet = getKV;
export const kvMutate = mutateKV;
