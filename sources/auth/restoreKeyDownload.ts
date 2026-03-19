import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { formatSecretKeyForBackup } from './secretKeyBackup';

const AUTO_BACKUP_MARKER_PREFIX = 'aha.restore-key-backup.v1';

export type RestoreKeyBackupPayload = {
    kind: 'aha-restore-key-backup';
    version: 1;
    exportedAt: string;
    secretKeyBase64url: string;
    secretKeyFormatted: string;
    note: string;
};

export function buildRestoreKeyBackupPayload(
    secret: string,
    exportedAt: Date = new Date(),
): RestoreKeyBackupPayload {
    return {
        kind: 'aha-restore-key-backup',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        secretKeyBase64url: secret,
        secretKeyFormatted: formatSecretKeyForBackup(secret),
        note: 'Use secretKeyBase64url or secretKeyFormatted to restore this account. Tokens are omitted because they can expire.',
    };
}

export function getRestoreKeyBackupFileName(exportedAt: Date = new Date()): string {
    const year = exportedAt.getFullYear();
    const month = String(exportedAt.getMonth() + 1).padStart(2, '0');
    const day = String(exportedAt.getDate()).padStart(2, '0');
    const hours = String(exportedAt.getHours()).padStart(2, '0');
    const minutes = String(exportedAt.getMinutes()).padStart(2, '0');
    const seconds = String(exportedAt.getSeconds()).padStart(2, '0');

    return `aha-restore-key-${year}${month}${day}-${hours}${minutes}${seconds}.json`;
}

async function getRestoreKeyBackupMarker(secret: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, secret);
    return `${AUTO_BACKUP_MARKER_PREFIX}:${digest.slice(0, 16)}`;
}

export async function autoDownloadRestoreKeyBackup(secret: string): Promise<boolean> {
    if (
        !secret
        || Platform.OS !== 'web'
        || typeof window === 'undefined'
        || typeof document === 'undefined'
        || typeof Blob === 'undefined'
        || typeof URL === 'undefined'
    ) {
        return false;
    }

    const markerKey = await getRestoreKeyBackupMarker(secret);
    try {
        if (window.localStorage.getItem(markerKey)) {
            return false;
        }
    } catch {
        // Ignore storage access failures and continue with the backup download.
    }

    const exportedAt = new Date();
    const payload = buildRestoreKeyBackupPayload(secret, exportedAt);
    const objectUrl = URL.createObjectURL(new Blob([
        JSON.stringify(payload, null, 2),
    ], {
        type: 'application/json',
    }));

    try {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = getRestoreKeyBackupFileName(exportedAt);
        link.rel = 'noopener';
        link.style.display = 'none';

        const mountTarget = document.body ?? document.documentElement;
        mountTarget.appendChild(link);
        link.click();
        link.remove();

        try {
            window.localStorage.setItem(markerKey, exportedAt.toISOString());
        } catch {
            // Ignore storage access failures after a successful download.
        }

        return true;
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
}
