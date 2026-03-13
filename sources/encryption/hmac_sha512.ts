import sodium from '@/encryption/libsodium.lib';

function sha512(data: Uint8Array): Uint8Array {
    return sodium.crypto_hash(data);
}

export async function hmac_sha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const blockSize = 128; // SHA512 block size in bytes
    const opad = 0x5c;
    const ipad = 0x36;

    // Prepare key
    let actualKey = key;
    if (key.length > blockSize) {
        actualKey = sha512(new Uint8Array(key));
    }

    // Pad key to block size
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(actualKey);

    // Create inner and outer padded keys
    const innerKey = new Uint8Array(blockSize);
    const outerKey = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
        innerKey[i] = paddedKey[i] ^ ipad;
        outerKey[i] = paddedKey[i] ^ opad;
    }

    // Inner hash: SHA512(innerKey || data)
    const innerData = new Uint8Array(blockSize + data.length);
    innerData.set(innerKey);
    innerData.set(data, blockSize);
    const innerHash = sha512(innerData);

    // Outer hash: SHA512(outerKey || innerHash)
    const outerData = new Uint8Array(blockSize + 64); // 64 bytes for SHA512 hash
    outerData.set(outerKey);
    outerData.set(new Uint8Array(innerHash), blockSize);
    const finalHash = sha512(outerData);

    return new Uint8Array(finalHash);
}