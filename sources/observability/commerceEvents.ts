import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getCurrentAuth } from '@/auth/AuthContext';
import { getServerUrl } from '@/sync/serverConfig';
import {
    buildStructuredCommerceEventPayload,
    type StructuredCommerceEventInput,
} from './commerceEventPayload';

const COMMERCE_OBSERVABILITY_PATH = '/v1/observability/commerce-events';

export type CommerceEventInput = StructuredCommerceEventInput;

function getAppVersion(): string | undefined {
    return typeof Constants.expoConfig?.version === 'string' ? Constants.expoConfig.version : undefined;
}

export function logCommerceEvent(event: CommerceEventInput, options?: { token?: string | null }): void {
    const auth = getCurrentAuth();
    const token = options?.token ?? auth?.credentials?.token;

    if (!token) {
        return;
    }

    const payload = buildStructuredCommerceEventPayload(event, {
        platform: Platform.OS,
        appVersion: getAppVersion(),
    });

    void fetch(`${getServerUrl()}${COMMERCE_OBSERVABILITY_PATH}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to log commerce event: ${response.status}`);
        }
    }).catch((error) => {
        console.warn('[CommerceObservability] Failed to send event', error);
    });
}
