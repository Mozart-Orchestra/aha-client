import axios from 'axios';
import { getServerUrl } from '@/sync/serverConfig';

export async function createAccountJoinTicket(token: string): Promise<{ ticket: string; expiresAt: string }> {
    const serverUrl = getServerUrl();
    const response = await axios.post(`${serverUrl}/v1/account/join-ticket`, {}, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return {
        ticket: response.data.ticket,
        expiresAt: response.data.expiresAt,
    };
}
