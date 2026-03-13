/**
 * Bootstrap local server auth.
 *
 * 1. Authenticate to local server using contentSecretKey (create first account)
 * 2. Encrypt contentSecretKey with kanban's QR public key (box encryption)
 * 3. Approve kanban's pending accountAuthRequest
 */
import tweetnacl from 'tweetnacl';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const SERVER_URL = 'http://localhost:7005';

// Read contentSecretKey
const accessKey = JSON.parse(readFileSync(`${homedir()}/.aha/access.key`, 'utf8'));
const contentSecretKey = Buffer.from(accessKey.encryption.contentSecretKey, 'base64');

console.log('contentSecretKey length:', contentSecretKey.length);

// Step 1: Generate auth challenge and create account
const signingKeypair = tweetnacl.sign.keyPair.fromSeed(new Uint8Array(contentSecretKey));
const challenge = new Uint8Array(randomBytes(32));
const signature = tweetnacl.sign.detached(challenge, signingKeypair.secretKey);

console.log('Authenticating to local server...');
const authRes = await fetch(`${SERVER_URL}/v1/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        publicKey: Buffer.from(signingKeypair.publicKey).toString('base64'),
        challenge: Buffer.from(challenge).toString('base64'),
        signature: Buffer.from(signature).toString('base64'),
    })
});
const authData = await authRes.json();
console.log('Auth response:', authData);

if (!authData.token) {
    console.error('Failed to get token!');
    process.exit(1);
}
const localToken = authData.token;
console.log('Got local token:', localToken.substring(0, 30) + '...');

// Step 2: Get kanban's pending public key (from DB via server - or direct from DB)
// kanban's publicKey hex from DB:
const kanbanPublicKeyHex = '818798AEB651BD6DBF39DF84BB31B0C111384D252A34905F84252E93E9B1304A';
const kanbanPublicKey = new Uint8Array(Buffer.from(kanbanPublicKeyHex, 'hex'));
console.log('Kanban publicKey length:', kanbanPublicKey.length);

// Step 3: Encrypt contentSecretKey with kanban's public key using box encryption
// (compatible with libsodium crypto_box_easy and tweetnacl box)
const ephemeralKeypair = tweetnacl.box.keyPair();
const nonce = new Uint8Array(randomBytes(tweetnacl.box.nonceLength));
const encrypted = tweetnacl.box(
    new Uint8Array(contentSecretKey),
    nonce,
    kanbanPublicKey,
    ephemeralKeypair.secretKey
);

// Bundle: ephemeral public key (32) + nonce (24) + encrypted
const bundle = new Uint8Array(ephemeralKeypair.publicKey.length + nonce.length + encrypted.length);
bundle.set(ephemeralKeypair.publicKey, 0);
bundle.set(nonce, ephemeralKeypair.publicKey.length);
bundle.set(encrypted, ephemeralKeypair.publicKey.length + nonce.length);

console.log('Encrypted bundle length:', bundle.length);

// Step 4: Approve the kanban's auth request
const approveRes = await fetch(`${SERVER_URL}/v1/auth/account/response`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localToken}`,
    },
    body: JSON.stringify({
        publicKey: Buffer.from(kanbanPublicKey).toString('base64'),
        response: Buffer.from(bundle).toString('base64'),
    })
});
const approveData = await approveRes.json();
console.log('Approve response status:', approveRes.status);
console.log('Approve response:', approveData);

if (approveData.success) {
    console.log('\n✅ Done! Kanban auth request approved.');
    console.log('The kanban app should now be able to log in.');
} else {
    console.error('\n❌ Approval failed!');
}
