import axios from 'axios';
import { getServerUrl } from '@/sync/serverConfig';

export interface InvitationStatus {
    verified: boolean;
    verifiedAt: string | null;
    codeUsed: string | null;
}

export type InvitationRedeemError =
    | 'code_invalid'
    | 'code_expired'
    | 'code_exhausted'
    | 'redeem_failed'
    | 'network_error';

export class InvitationRedeemFailure extends Error {
    constructor(public readonly reason: InvitationRedeemError, message?: string) {
        super(message ?? reason);
        this.name = 'InvitationRedeemFailure';
    }
}

export async function fetchInvitationStatus(token: string): Promise<InvitationStatus> {
    const serverUrl = getServerUrl();
    const response = await axios.get<InvitationStatus>(
        `${serverUrl}/v1/invitation/status`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
}

export async function redeemInvitation(token: string, code: string): Promise<void> {
    const serverUrl = getServerUrl();
    try {
        await axios.post(
            `${serverUrl}/v1/invitation/redeem`,
            { code },
            { headers: { Authorization: `Bearer ${token}` } },
        );
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const reason = error.response?.data?.error as InvitationRedeemError | undefined;
            if (reason) {
                throw new InvitationRedeemFailure(reason);
            }
            if (!error.response) {
                throw new InvitationRedeemFailure('network_error');
            }
        }
        throw new InvitationRedeemFailure('redeem_failed');
    }
}
