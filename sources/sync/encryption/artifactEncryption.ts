import { decodeBase64, encodeBase64 } from '@/encryption/base64';
import { ArtifactHeader, ArtifactBody } from '../artifactTypes';
import { AES256Encryption } from './encryptor';
import * as Random from 'expo-crypto';

export class ArtifactEncryption {
    private encryptor: AES256Encryption;

    constructor(dataEncryptionKey: Uint8Array) {
        this.encryptor = new AES256Encryption(dataEncryptionKey);
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
        const parseBody = (value: any): ArtifactBody | null => {
            if (typeof value !== 'object' || value === null) {
                return null;
            }
            return {
                body: typeof value.body === 'string' ? value.body : null
            };
        };

        try {
            const decrypted = await this.encryptor.decrypt([decoded]);
            const parsed = parseBody(decrypted[0]);
            if (parsed) {
                return parsed;
            }
        } catch {
            // Ignore decryption failures; plaintext fallback will handle team artifacts.
        }

        try {
            const plainText = new TextDecoder().decode(decoded);
            const parsedJson = JSON.parse(plainText);
            const parsed = parseBody(parsedJson);
            if (parsed) {
                return parsed;
            }
        } catch {
            // Ignore plaintext parse errors and fall through to null.
        }

        console.error('Failed to decrypt or parse artifact body');
        return null;
    }
}
