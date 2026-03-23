import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { checkAuth } from '@/utils/handleResponse';
import { getServerUrl } from './serverConfig';

/**
 * Connect a service to the user's account
 */
export async function connectService(
    credentials: AuthCredentials,
    service: string,
    token: any
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/connect/${service}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: JSON.stringify(token) })
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            throw new Error(`Failed to connect ${service}: ${response.status}`);
        }

        const data = await response.json() as { success: true };
        if (!data.success) {
            throw new Error(`Failed to connect ${service} account`);
        }
    });
}

/**
 * Fetch a connected service token from the user's account.
 * Returns parsed JSON when the token payload was stored as JSON.
 */
export async function getServiceToken(
    credentials: AuthCredentials,
    service: string,
): Promise<any | null> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/connect/${service}/token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            }
        });
        checkAuth(response, credentials.token);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch ${service} token: ${response.status}`);
        }

        const data = await response.json() as { token?: string | null };
        if (!data.token) {
            return null;
        }

        try {
            return JSON.parse(data.token);
        } catch {
            return data.token;
        }
    });
}

/**
 * Disconnect a connected service from the user's account
 */
export async function disconnectService(credentials: AuthCredentials, service: string): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/connect/${service}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`
            }
        });
        checkAuth(response, credentials.token);

        if (!response.ok) {
            if (response.status === 404) {
                const error = await response.json();
                throw new Error(error.error || `${service} account not connected`);
            }
            throw new Error(`Failed to disconnect ${service}: ${response.status}`);
        }

        const data = await response.json() as { success: true };
        if (!data.success) {
            throw new Error(`Failed to disconnect ${service} account`);
        }
    });
}
