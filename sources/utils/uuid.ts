/**
 * Generates a UUID v4.
 *
 * crypto.randomUUID() requires a secure context (HTTPS or localhost).
 * When accessed via LAN IP over plain HTTP, randomUUID is unavailable but
 * getRandomValues() still works. This function uses randomUUID when available
 * and falls back to a getRandomValues-based implementation otherwise.
 */
export function randomUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback: build UUID v4 from random bytes (works in non-secure HTTP contexts)
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    return [
        bytes.slice(0, 4),
        bytes.slice(4, 6),
        bytes.slice(6, 8),
        bytes.slice(8, 10),
        bytes.slice(10, 16),
    ]
        .map((seg) => Array.from(seg).map((b) => b.toString(16).padStart(2, '0')).join(''))
        .join('-');
}
