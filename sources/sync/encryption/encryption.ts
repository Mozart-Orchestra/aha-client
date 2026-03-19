import { deriveKey } from "@/encryption/deriveKey";
import { AES256Encryption, BoxEncryption, SecretBoxEncryption, Encryptor, Decryptor } from "./encryptor";
import { encodeHex } from "@/encryption/hex";
import { EncryptionCache } from "./encryptionCache";
import { SessionEncryption } from "./sessionEncryption";
import { MachineEncryption } from "./machineEncryption";
import { encodeBase64, decodeBase64 } from "@/encryption/base64";
import sodium from '@/encryption/libsodium.lib';
import { decryptBox, encryptBox } from "@/encryption/libsodium";
import { randomUUID } from '@/utils/uuid';

export class Encryption {

    static async create(masterSecret: Uint8Array) {

        // Derive content data key to open session and machine records
        const contentDataKey = await deriveKey(masterSecret, 'Happy EnCoder', ['content']);

        // Derive content data key keypair
        const contentKeyPair = sodium.crypto_box_seed_keypair(contentDataKey);

        // Derive anonymous ID
        const anonID = encodeHex((await deriveKey(masterSecret, 'Happy Coder', ['analytics', 'id']))).slice(0, 16).toLowerCase();

        // Create encryption
        return new Encryption(anonID, masterSecret, contentKeyPair, contentDataKey);
    }

    private readonly legacyEncryption: SecretBoxEncryption;
    private readonly contentKeyPair: sodium.KeyPair;
    readonly anonID: string;
    readonly contentDataKey: Uint8Array;

    // Session and machine encryption management
    private sessionEncryptions = new Map<string, SessionEncryption>();
    private machineEncryptions = new Map<string, MachineEncryption>();
    private cache: EncryptionCache;

    private constructor(anonID: string, masterSecret: Uint8Array, contentKeyPair: sodium.KeyPair, contentDataKey: Uint8Array) {
        this.anonID = anonID;
        this.contentKeyPair = contentKeyPair;
        this.legacyEncryption = new SecretBoxEncryption(masterSecret);
        this.cache = new EncryptionCache();
        this.contentDataKey = contentDataKey;
    }

    //
    // Core encryption opening
    //

    async openEncryption(dataEncryptionKey: Uint8Array | null): Promise<Encryptor & Decryptor> {
        if (!dataEncryptionKey) {
            return this.legacyEncryption;
        }
        return new AES256Encryption(dataEncryptionKey);
    }

    //
    // Session operations
    //

    /**
     * Initialize sessions with their encryption keys
     * This should be called once when sessions are loaded
     */
    async initializeSessions(sessions: Map<string, Uint8Array | null>): Promise<void> {
        for (const [sessionId, dataKey] of sessions) {
            // Skip if already initialized
            if (this.sessionEncryptions.has(sessionId)) {
                continue;
            }

            // Create appropriate encryptor based on data key
            const encryptor = await this.openEncryption(dataKey);

            // Create and cache session encryption
            const sessionEnc = new SessionEncryption(
                sessionId,
                encryptor,
                this.cache
            );
            this.sessionEncryptions.set(sessionId, sessionEnc);
        }
    }

    /**
     * Get session encryption if it has been initialized
     * Returns null if not initialized (should never happen in normal flow)
     */
    getSessionEncryption(sessionId: string): SessionEncryption | null {
        return this.sessionEncryptions.get(sessionId) || null;
    }

    /**
     * Remove session encryption from memory when session is deleted
     */
    removeSessionEncryption(sessionId: string): void {
        this.sessionEncryptions.delete(sessionId);
        // Also clear any cached data for this session
        this.cache.clearSessionCache(sessionId);
    }

    //
    // Machine operations
    //

    /**
     * Initialize machines with their encryption keys
     * This should be called once when machines are loaded
     */
    async initializeMachines(machines: Map<string, Uint8Array | null>): Promise<void> {
        for (const [machineId, dataKey] of machines) {
            // Skip if already initialized
            if (this.machineEncryptions.has(machineId)) {
                continue;
            }

            // Create appropriate encryptor based on data key
            const encryptor = await this.openEncryption(dataKey);

            // Create and cache machine encryption
            const machineEnc = new MachineEncryption(
                machineId,
                encryptor,
                this.cache
            );
            this.machineEncryptions.set(machineId, machineEnc);
        }
    }

    /**
     * Get machine encryption if it has been initialized
     * Returns null if not initialized (should never happen in normal flow)
     */
    getMachineEncryption(machineId: string): MachineEncryption | null {
        return this.machineEncryptions.get(machineId) || null;
    }

    //
    // Legacy methods for machine metadata (temporary until machines are migrated)
    //

    async encryptRaw(data: any): Promise<string> {
        const encrypted = await this.legacyEncryption.encrypt([data]);
        return encodeBase64(encrypted[0], 'base64');
    }

    async decryptRaw(encrypted: string): Promise<any | null> {
        try {
            const encryptedData = decodeBase64(encrypted, 'base64');
            const decrypted = await this.legacyEncryption.decrypt([encryptedData]);
            return decrypted[0] || null;
        } catch (error) {
            return null;
        }
    }

    //
    // Data Encryption Key decryption
    //

    async decryptEncryptionKey(encrypted: string) {
        const resolved = await this.decryptEncryptionKeyWithVariant(encrypted);
        return resolved?.key ?? null;
    }

    async decryptEncryptionKeyWithVariant(encrypted: string): Promise<{
        key: Uint8Array;
        variant: 'legacy' | 'dataKey';
        wrapper: 'boxed-v0' | 'legacy';
    } | null> {
        const encryptedKey = decodeBase64(encrypted, 'base64');
        if (encryptedKey.length === 0) {
            return null;
        }

        if (encryptedKey[0] !== 0) {
            try {
                const decrypted = await this.legacyEncryption.decrypt([encryptedKey]);
                const key = decrypted[0];
                if (!key) {
                    return null;
                }

                if (key instanceof Uint8Array) {
                    return { key, variant: 'legacy', wrapper: 'legacy' };
                }
                if (Array.isArray(key)) {
                    return { key: new Uint8Array(key), variant: 'legacy', wrapper: 'legacy' };
                }
                if (typeof key === 'string') {
                    return {
                        key: decodeBase64(key, 'base64'),
                        variant: 'legacy',
                        wrapper: 'legacy',
                    };
                }

                if (typeof key === 'object' && key !== null) {
                    const numericEntries = Object.entries(key as Record<string, unknown>)
                        .reduce<Array<[number, number]>>((acc, [entryKey, value]) => {
                            if (/^\d+$/.test(entryKey) && typeof value === 'number') {
                                acc.push([Number(entryKey), value]);
                            }
                            return acc;
                        }, [])
                        .sort(([left], [right]) => left - right)
                        .map(([, value]) => value);

                    if (numericEntries.length > 0) {
                        return {
                            key: new Uint8Array(numericEntries),
                            variant: 'legacy',
                            wrapper: 'legacy',
                        };
                    }
                }
            } catch {
                return null;
            }

            return null;
        }

        const decrypted = decryptBox(encryptedKey.slice(1), this.contentKeyPair.privateKey);
        if (!decrypted) {
            return null;
        }
        return {
            key: decrypted,
            variant: 'dataKey',
            wrapper: 'boxed-v0',
        };
    }

    async encryptEncryptionKey(key: Uint8Array): Promise<Uint8Array> {
        // Use public key for encryption (encrypt TO ourselves)
        const encrypted = encryptBox(key, this.contentKeyPair.publicKey);
        const result = new Uint8Array(encrypted.length + 1);
        result[0] = 0; // Version byte
        result.set(encrypted, 1);
        return result;
    }

    generateId(): string {
        return randomUUID();
    }
}
