import axios from 'axios';
import { getServerUrl } from '@/sync/serverConfig';

export async function createAccountJoinTicket(token: string): Promise<{ ticket: string; expiresAt: string }> {
    const serverUrl = getServerUrl();
    const headers = {
        Authorization: `Bearer ${token}`,
    };
    let response;

    try {
        response = await axios.post(`${serverUrl}/v1/account/join-ticket`, {}, { headers });
    } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
            throw error;
        }

        response = await axios.post(`${serverUrl}/v1/auth/joincode/create`, {}, { headers });
    }

    // Server returns both `code` (new) and `ticket` (alias for backward compat). Prefer `code`.
    const ticket: string = response.data.code ?? response.data.ticket;
    return {
        ticket,
        expiresAt: response.data.expiresAt,
    };
}
