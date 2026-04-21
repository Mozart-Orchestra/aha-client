import { authChallenge } from "./authChallenge";
import axios from 'axios';
import { encodeBase64 } from "../encryption/base64";
import { getServerUrl } from "@/sync/serverConfig";

type AuthMode = 'create' | 'reconnect';

export interface AuthGetTokenResult {
    token: string;
    invitationVerified: boolean | null;
}

export async function authGetToken(secret: Uint8Array, mode: AuthMode = 'reconnect') {
    const API_ENDPOINT = getServerUrl();
    const { challenge, signature, publicKey } = authChallenge(secret);
    const endpoint = mode === 'create' ? '/v1/auth' : '/v1/auth/reconnect';
    const response = await axios.post(`${API_ENDPOINT}${endpoint}`, {
        challenge: encodeBase64(challenge),
        signature: encodeBase64(signature),
        publicKey: encodeBase64(publicKey)
    });
    const data = response.data;
    return {
        token: data.token,
        invitationVerified: data.invitationVerified ?? null,
    } satisfies AuthGetTokenResult;
}
