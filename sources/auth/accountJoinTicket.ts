import axios from 'axios';
import { getServerUrl } from '@/sync/serverConfig';

export async function createAccountJoinTicket(token: string): Promise<{ ticket: string; expiresAt: string }> {
    const serverUrl = getServerUrl();
    const response = await axios.post(`${serverUrl}/v1/account/join-ticket`, {}, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    // Server returns both `code` (new) and `ticket` (alias for backward compat). Prefer `code`.
    const ticket: string = response.data.code ?? response.data.ticket;
    return {
        ticket,
        expiresAt: response.data.expiresAt,
    };
}
