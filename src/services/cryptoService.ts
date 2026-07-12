import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT = 'lets-encrypt-app:v2';
export const V2_PREFIX = 'v2:';
const IV_BYTES = 16;
const HMAC_BYTES = 32;

type DerivedV2Keys = {
  encKey: CryptoJS.lib.WordArray;
  macKey: CryptoJS.lib.WordArray;
};

type Pbkdf2Callback = (err: Error | null, derivedKey?: {toString: (enc: string) => string}) => void;

const derivationCache = new Map<string, DerivedV2Keys>();
const inflightDerivations = new Map<string, Promise<DerivedV2Keys>>();

let quickPbkdf2: ((
  password: string,
  salt: string,
  iterations: number,
  keylen: number,
  digest: string,
  callback: Pbkdf2Callback,
) => void) | null = null;

try {
  quickPbkdf2 = require('react-native-quick-crypto').pbkdf2;
} catch {
  quickPbkdf2 = null;
}

export function getFingerprint(secret: string): string {
  return CryptoJS.SHA256(secret).toString();
}

function getLegacyMd5Fingerprint(secret: string): string {
  return CryptoJS.MD5(secret).toString();
}

export function fingerprintMatches(secret: string, expected: string): boolean {
  const normalized = expected.trim().toLowerCase().replace(/\s/g, '');
  if (!normalized) {
    return false;
  }
  if (normalized === getFingerprint(secret)) {
    return true;
  }
  return (
    normalized.length === 32 && normalized === getLegacyMd5Fingerprint(secret)
  );
}

function getSecureRandomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  const random = CryptoJS.lib.WordArray.random(count);
  for (let i = 0; i < count; i += 1) {
    bytes[i] = (random.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return bytes;
}

export function generateSecureId(): string {
  const bytes = getSecureRandomBytes(4);
  const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${Date.now()}-${suffix}`;
}

export function generateSecret(length = 24): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = getSecureRandomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}

function keysFromPbkdf2Hex(hex: string): DerivedV2Keys {
  return {
    encKey: CryptoJS.enc.Hex.parse(hex.slice(0, 64)),
    macKey: CryptoJS.enc.Hex.parse(hex.slice(64, 128)),
  };
}

function deriveV2KeysWithCryptoJs(secret: string): DerivedV2Keys {
  const salt = CryptoJS.enc.Utf8.parse(PBKDF2_SALT);
  const derived = CryptoJS.PBKDF2(secret, salt, {
    keySize: (32 + 32) / 4,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  return keysFromPbkdf2Hex(derived.toString(CryptoJS.enc.Hex));
}

function deriveV2KeysNative(secret: string): Promise<DerivedV2Keys> {
  if (!quickPbkdf2) {
    return Promise.resolve(deriveV2KeysWithCryptoJs(secret));
  }

  return new Promise((resolve, reject) => {
    quickPbkdf2!(
      secret,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
      64,
      'sha256',
      (err, key) => {
        if (err || !key) {
          reject(err ?? new Error('PBKDF2 failed'));
          return;
        }
        resolve(keysFromPbkdf2Hex(key.toString('hex')));
      },
    );
  });
}

async function deriveV2Keys(secret: string): Promise<DerivedV2Keys> {
  const cached = derivationCache.get(secret);
  if (cached) {
    return cached;
  }

  const inflight = inflightDerivations.get(secret);
  if (inflight) {
    return inflight;
  }

  const promise = deriveV2KeysNative(secret)
    .then(keys => {
      derivationCache.set(secret, keys);
      inflightDerivations.delete(secret);
      return keys;
    })
    .catch(error => {
      inflightDerivations.delete(secret);
      throw error;
    });

  inflightDerivations.set(secret, promise);
  return promise;
}

export async function warmKeyDerivation(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed) {
    return;
  }
  await deriveV2Keys(trimmed);
}

function deriveLegacyKey(secret: string): CryptoJS.lib.WordArray {
  return CryptoJS.MD5(secret);
}

function deriveLegacyIv(secret: string): CryptoJS.lib.WordArray {
  return CryptoJS.MD5(`${secret}:iv`);
}

function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const bytes = new Uint8Array(wordArray.sigBytes);
  for (let i = 0; i < wordArray.sigBytes; i += 1) {
    bytes[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return bytes;
}

function uint8ArrayToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

export async function encryptMessage(
  plaintext: string,
  secret: string,
): Promise<string> {
  const {encKey, macKey} = await deriveV2Keys(secret);
  const iv = uint8ArrayToWordArray(getSecureRandomBytes(IV_BYTES));
  const encrypted = CryptoJS.AES.encrypt(plaintext, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ciphertext = encrypted.ciphertext;
  const mac = CryptoJS.HmacSHA256(iv.clone().concat(ciphertext), macKey);
  const payload = iv.clone().concat(ciphertext).concat(mac);
  return `${V2_PREFIX}${CryptoJS.enc.Base64.stringify(payload)}`;
}

async function decryptV2Message(
  ciphertextBase64: string,
  secret: string,
): Promise<string> {
  const bytes = wordArrayToUint8Array(CryptoJS.enc.Base64.parse(ciphertextBase64));
  if (bytes.length < IV_BYTES + HMAC_BYTES + 1) {
    throw new Error('Decryption failed. Check the ciphertext and selected key.');
  }

  const iv = uint8ArrayToWordArray(bytes.slice(0, IV_BYTES));
  const mac = uint8ArrayToWordArray(bytes.slice(bytes.length - HMAC_BYTES));
  const ciphertext = uint8ArrayToWordArray(
    bytes.slice(IV_BYTES, bytes.length - HMAC_BYTES),
  );

  const {encKey, macKey} = await deriveV2Keys(secret);
  const expectedMac = CryptoJS.HmacSHA256(iv.clone().concat(ciphertext), macKey);
  if (
    !timingSafeEqual(
      wordArrayToUint8Array(mac),
      wordArrayToUint8Array(expectedMac),
    )
  ) {
    throw new Error('Decryption failed. Check the ciphertext and selected key.');
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({ciphertext});
  const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  if (!plaintext) {
    throw new Error('Decryption failed. Check the ciphertext and selected key.');
  }
  return plaintext;
}

function decryptLegacyMessage(ciphertextBase64: string, secret: string): string {
  const key = deriveLegacyKey(secret);
  const iv = deriveLegacyIv(secret);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64.trim()),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
  if (!plaintext) {
    throw new Error('Decryption failed. Check the ciphertext and selected key.');
  }
  return plaintext;
}

export async function decryptMessage(
  ciphertext: string,
  secret: string,
): Promise<string> {
  const trimmed = ciphertext.trim();
  if (trimmed.startsWith(V2_PREFIX)) {
    return decryptV2Message(trimmed.slice(V2_PREFIX.length), secret);
  }
  return decryptLegacyMessage(trimmed, secret);
}
