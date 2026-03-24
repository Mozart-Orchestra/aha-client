import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
import { getServerUrl } from './serverConfig';

export type WeixinPushPolicy = 'all' | 'important' | 'silent';

export interface WeixinChannelStatus {
    connected: boolean;
    pushPolicy: WeixinPushPolicy;
    boundAt?: boolean;
}

export interface WeixinQRCodeResponse {
    qrcode: string;
    displayUrl: string;
}

export interface WeixinBindCredentials {
    token: string;
    baseUrl: string;
    weixinUserId?: string;
    accountId?: string;
}

export interface WeixinPollResponse {
    status: 'wait' | 'scaned' | 'confirmed' | 'expired' | string;
    credentials?: WeixinBindCredentials;
}

function authHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export async function fetchChannelStatus(credentials: AuthCredentials): Promise<{ weixin: WeixinChannelStatus | null }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/status`, {
            method: 'GET',
            headers: authHeaders(credentials.token),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to fetch channel status: ${response.status}`);
        }

        return await response.json() as { weixin: WeixinChannelStatus | null };
    });
}

export async function requestWeixinQRCode(credentials: AuthCredentials): Promise<WeixinQRCodeResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/weixin/qr`, {
            method: 'POST',
            headers: authHeaders(credentials.token),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to request WeChat QR code: ${response.status}`);
        }

        return await response.json() as WeixinQRCodeResponse;
    });
}

export async function pollWeixinQRCode(credentials: AuthCredentials, qrcode: string): Promise<WeixinPollResponse> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/weixin/poll`, {
            method: 'POST',
            headers: authHeaders(credentials.token),
            body: JSON.stringify({ qrcode }),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to poll WeChat QR status: ${response.status}`);
        }

        return await response.json() as WeixinPollResponse;
    });
}

export async function bindWeixinChannel(credentials: AuthCredentials, weixin: WeixinBindCredentials): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/weixin/bind`, {
            method: 'POST',
            headers: authHeaders(credentials.token),
            body: JSON.stringify(weixin),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to bind WeChat: ${response.status}`);
        }
    });
}

export async function disconnectWeixinChannel(credentials: AuthCredentials): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/weixin`, {
            method: 'DELETE',
            headers: authHeaders(credentials.token),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to disconnect WeChat: ${response.status}`);
        }
    });
}

export async function updateWeixinPushPolicy(credentials: AuthCredentials, pushPolicy: WeixinPushPolicy): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/channels/weixin/policy`, {
            method: 'PATCH',
            headers: authHeaders(credentials.token),
            body: JSON.stringify({ pushPolicy }),
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to update WeChat push policy: ${response.status}`);
        }
    });
}
