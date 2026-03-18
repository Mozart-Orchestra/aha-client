import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { ArtifactHeader, ArtifactBody } from '../artifactTypes';
import { AES256Encryption, SecretBoxEncryption, type Decryptor, type Encryptor } from './encryptor';
import * as Random from 'expo-crypto';

export class ArtifactEncryption {
    private encryptor: Encryptor & Decryptor;

    constructor(dataEncryptionKey: Uint8Array, variant: 'legacy' | 'dataKey' = 'dataKey') {
        this.encryptor = variant === 'legacy'
            ? new SecretBoxEncryption(dataEncryptionKey)
            : new AES256Encryption(dataEncryptionKey);
    }

    /**
     * Generate a new data encryption key for an artifact
     */
    static generateDataEncryptionKey(): Uint8Array {
        return Random.getRandomBytes(32);  // 256 bits for AES-256
    }

    /**
     * Encrypt artifact header
     */
    async encryptHeader(header: ArtifactHeader): Promise<string> {
        const encrypted = await this.encryptor.encrypt([header]);
        return encodeBase64(encrypted[0], 'base64');
    }

    /**
     * Decrypt artifact header
     */
    async decryptHeader(encryptedHeader: string): Promise<ArtifactHeader | null> {
        try {
            const encryptedData = decodeBase64(encryptedHeader, 'base64');
            const decrypted = await this.encryptor.decrypt([encryptedData]);
            if (!decrypted[0]) {
                return null;
            }
            // Validate structure
            const header = decrypted[0] as any;
            if (typeof header !== 'object' || header === null) {
                return null;
            }
            return {
                title: typeof header.title === 'string' ? header.title : null,
                type: header.type,
                sessions: header.sessions,
                draft: header.draft
            };
        } catch (error) {
            console.error('Failed to decrypt artifact header:', error);
            return null;
        }
    }

    /**
     * Encrypt artifact body
     */
    async encryptBody(body: ArtifactBody): Promise<string> {
        const encrypted = await this.encryptor.encrypt([body]);
        return encodeBase64(encrypted[0], 'base64');
    }

    /**
     * Decrypt artifact body
     */
    async decryptBody(encryptedBody: string): Promise<ArtifactBody | null> {
        const decoded = decodeBase64(encryptedBody, 'base64');
        const safeStringify = (value: unknown): string | null => {
            try {
                return JSON.stringify(value);
            } catch {
                return null;
            }
        };
        const parseBody = (value: any): ArtifactBody | null => {
            if (value === null) {
                return { body: null };
            }
            if (typeof value === 'string') {
                return { body: value };
            }
            if (typeof value !== 'object') {
                return null;
            }
            // Handle both wrapped bodies ({ body: ... }) and direct body objects (legacy/plaintext)
            if ('body' in value) {
                const bodyValue = (value as { body?: unknown }).body;
                if (bodyValue === undefined) {
                    const fallback = safeStringify(value);
                    return fallback ? { body: fallback } : null;
                }
                if (bodyValue === null) {
                    return { body: null };
                }
                if (typeof bodyValue === 'string') {
                    return { body: bodyValue };
                }
                if (typeof bodyValue === 'object') {
                    const serialized = safeStringify(bodyValue);
                    return serialized ? { body: serialized } : null;
                }
                return null;
            }
            const serialized = safeStringify(value);
            return serialized ? { body: serialized } : null;
        };

        // Try encrypted format first
        try {
            const decrypted = await this.encryptor.decrypt([decoded]);
            if (decrypted[0] !== null) {
                const parsed = parseBody(decrypted[0]);
                if (parsed) {
                    return parsed;
                }
                // Decryption succeeded but parsing failed - try treating decrypted result as direct body
                if (typeof decrypted[0] === 'string') {
                    return { body: decrypted[0] };
                }
            }
        } catch (decryptError) {
            // Decryption failed, will try plaintext fallback for legacy data
            // Store error for diagnostic logging
            var decryptionError = decryptError;
        }

        // Fallback to plaintext for legacy artifacts (temporary migration support)
        // TODO: Remove this fallback after all artifacts have been migrated
        let parseError: Error | undefined;
        try {
            const plainText = new TextDecoder().decode(decoded);
            const parsedJson = JSON.parse(plainText);
            const parsed = parseBody(parsedJson);
            if (parsed) {
                return parsed;
            }
            // Try treating the plain text itself as the body if it's valid JSON but not in expected format
            if (typeof parsedJson === 'string') {
                return { body: parsedJson };
            }
        } catch (error) {
            // Neither encrypted nor plaintext format worked
            parseError = error instanceof Error ? error : new Error(String(error));
        }

        // Enhanced diagnostic logging for troubleshooting
        console.error('❌ [decryptBody] 双重失败 - 诊断信息:', {
            inputLength: encryptedBody.length,
            base64Decoded: decoded !== null && decoded.length > 0,
            decryptedBranch: (decryptionError as any) instanceof Error ? {
                success: false,
                error: (decryptionError as any).message,
                name: (decryptionError as any).constructor.name
            } : 'unknown',
            plaintextBranch: parseError instanceof Error ? {
                success: false,
                error: parseError.message,
                name: parseError.constructor.name
            } : 'unknown',
            hint: '检查: 1)加密密钥是否正确 2)数据格式是否符合ArtifactBody接口 3)是否需要迁移'
        });
        return null;
    }
}
