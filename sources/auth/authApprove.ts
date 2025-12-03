
import axios from 'axios';
import { encodeBase64 } from "../encryption/base64";
import { getServerUrl } from "@/sync/serverConfig";

interface AuthRequestStatus {
    status: 'not_found' | 'pending' | 'authorized';
    supportsV2: boolean;
}

export async function authApprove(token: string, publicKey: Uint8Array, answerV1: Uint8Array, answerV2: Uint8Array) {
    const API_ENDPOINT = getServerUrl();
    const publicKeyBase64 = encodeBase64(publicKey);

    // First, check the auth request status
    console.log(`[AUTH APPROVE] Checking status for publicKey: ${publicKeyBase64.substring(0, 20)}...`);
    const statusResponse = await axios.get<AuthRequestStatus>(
        `${API_ENDPOINT}/v1/auth/request/status`,
        {
            params: {
                publicKey: publicKeyBase64
            }
        }
    );

    const { status, supportsV2 } = statusResponse.data;
    console.log(`[AUTH APPROVE] Status received: ${status}, supportsV2: ${supportsV2}`);

    // Handle different status cases
    if (status === 'not_found') {
        // Already authorized, no need to approve again
        console.log('[AUTH APPROVE] ⚠️ Auth request not found (possibly expired or invalid key)');
        return;
    }

    if (status === 'authorized') {
        // Already authorized, no need to approve again
        console.log('[AUTH APPROVE] ✅ Auth request already authorized');
        return;
    }

    // Handle pending status
    if (status === 'pending') {
        console.log('[AUTH APPROVE] 📤 Sending auth response...');
        await axios.post(`${API_ENDPOINT}/v1/auth/response`, {
            publicKey: publicKeyBase64,
            response: supportsV2 ? encodeBase64(answerV2) : encodeBase64(answerV1)
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        console.log('[AUTH APPROVE] ✅ Auth response sent successfully');
    }
}