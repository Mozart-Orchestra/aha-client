import { describe, expect, it, vi } from 'vitest';

vi.mock('@/encryption/deriveKey', () => ({
    deriveKey: vi.fn(async (master: Uint8Array, usage: string, path: string[]) => {
        if (usage === 'Happy EnCoder' && path.join('/') === 'content') {
            return new Uint8Array([7, 8, 9, 10]);
        }
        if (usage === 'Happy Coder' && path.join('/') === 'analytics/id') {
            return new Uint8Array([11, 12, 13, 14]);
        }
        return master;
    }),
}));

vi.mock('@/encryption/libsodium.lib', () => ({
    default: {
        crypto_box_seed_keypair: (seed: Uint8Array) => ({
            publicKey: new Uint8Array([((seed[0] ?? 0) + 1) & 0xff]),
            privateKey: new Uint8Array(seed),
        }),
    },
}));

vi.mock('@/encryption/libsodium', () => ({
    encryptBox: (data: Uint8Array, recipientPublicKey: Uint8Array) => {
        const result = new Uint8Array(data.length + 1);
        result[0] = recipientPublicKey[0] ?? 0;
        result.set(data, 1);
        return result;
    },
    decryptBox: (bundle: Uint8Array, recipientSecretKey: Uint8Array) => {
        const expectedMarker = ((recipientSecretKey[0] ?? 0) + 1) & 0xff;
        if ((bundle[0] ?? 0) !== expectedMarker) {
            return null;
        }
        return bundle.slice(1);
    },
}));

import { encodeBase64 } from '@/encryption/base64';
import { Encryption } from './encryption';

describe('Encryption data-key compatibility', () => {
    it('decrypts canonical boxed-v0 keys with the derived content keypair', async () => {
        const encryption = await Encryption.create(new Uint8Array([1, 2, 3, 4]));
        const wrapped = await encryption.encryptEncryptionKey(new Uint8Array([21, 22, 23]));

        await expect(encryption.decryptEncryptionKeyWithVariant(encodeBase64(wrapped, 'base64'))).resolves.toEqual({
            key: new Uint8Array([21, 22, 23]),
            variant: 'dataKey',
            wrapper: 'boxed-v0',
        });
    });

    it('keeps compatibility with boxed-v0 keys wrapped by older CLI builds', async () => {
        const encryption = await Encryption.create(new Uint8Array([1, 2, 3, 4]));
        const legacyCliWrapped = encodeBase64(new Uint8Array([0, 2, 31, 32, 33]), 'base64');

        await expect(encryption.decryptEncryptionKeyWithVariant(legacyCliWrapped)).resolves.toEqual({
            key: new Uint8Array([31, 32, 33]),
            variant: 'dataKey',
            wrapper: 'boxed-v0',
        });
    });
});
