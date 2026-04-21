import axios from 'axios';
import { getServerUrl } from '@/sync/serverConfig';
import { getCurrentAuth } from '@/auth/AuthContext';

/**
 * Genome hub requires a short-lived user-scoped token. This module caches the
 * token in-memory for the session and refreshes it a minute before the server
 * says it expires. One concurrent mint request at a time to avoid thundering.
 */

interface CachedToken {
    token: string;
    expiresAt: number;
}

const REFRESH_BUFFER_MS = 60 * 1000;

let cached: CachedToken | null = null;
let inFlight: Promise<string> | null = null;

function now(): number {
    return Date.now();
}

async function mintHubToken(appToken: string): Promise<string> {
    const serverUrl = getServerUrl();
    const response = await axios.post<{ token: string; expiresIn: number }>(
        `${serverUrl}/v1/genome/token`,
        {},
        { headers: { Authorization: `Bearer ${appToken}` } },
    );

    const ttlMs = Math.max(5_000, response.data.expiresIn * 1000);
    cached = {
        token: response.data.token,
        expiresAt: now() + ttlMs - REFRESH_BUFFER_MS,
    };
    return cached.token;
}

export function invalidateHubToken(): void {
    cached = null;
    inFlight = null;
}

export async function getHubToken(): Promise<string> {
    const auth = getCurrentAuth();
    if (!auth?.credentials?.token) {
        throw new Error('hub_token_requires_login');
    }

    if (cached && cached.expiresAt > now()) {
        return cached.token;
    }

    if (inFlight) {
        return inFlight;
    }

    inFlight = mintHubToken(auth.credentials.token)
        .finally(() => { inFlight = null; });
    return inFlight;
}
