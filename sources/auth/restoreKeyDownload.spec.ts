import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
    CryptoDigestAlgorithm: {
        SHA256: 'SHA256',
    },
    digestStringAsync: vi.fn(async () => 'mocked-digest'),
}));

vi.mock('react-native', () => ({
    Platform: {
        OS: 'web',
    },
}));

import { encodeBase64 } from '@/encryption/base64';

import {
    buildRestoreKeyBackupPayload,
    getRestoreKeyBackupFileName,
} from './restoreKeyDownload';
import { formatSecretKeyForBackup } from './secretKeyBackup';

function createSecret(): string {
    const bytes = new Uint8Array(32);
    for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = index;
    }
    return encodeBase64(bytes, 'base64url');
}

describe('restoreKeyDownload', () => {
    it('builds a restore backup payload with both machine and human friendly keys', () => {
        const secret = createSecret();
        const exportedAt = new Date('2026-03-19T10:30:45.000Z');

        expect(buildRestoreKeyBackupPayload(secret, exportedAt)).toEqual({
            kind: 'aha-restore-key-backup',
            version: 1,
            exportedAt: '2026-03-19T10:30:45.000Z',
            secretKeyBase64url: secret,
            secretKeyFormatted: formatSecretKeyForBackup(secret),
            note: 'Use secretKeyBase64url or secretKeyFormatted to restore this account. Tokens are omitted because they can expire.',
        });
    });

    it('formats a download filename that is stable and windows-safe', () => {
        const exportedAt = new Date(2026, 2, 19, 18, 4, 9);
        expect(getRestoreKeyBackupFileName(exportedAt)).toBe('aha-restore-key-20260319-180409.json');
    });
});
