import CryptoJS from 'crypto-js';

import {MAX_DERIVATION_CACHE_ENTRIES} from './limits';

const PBKDF2_ITERATIONS_V2 = 100_000;
const PBKDF2_SALT_V2 = 'lets-encrypt-app:v2';
const PBKDF2_ITERATIONS_V3 = 100_000;
export const V2_PREFIX = 'v2:';
export const V3_PREFIX = 'v3:';
const IV_BYTES = 16;
const SALT_BYTES = 16;
const HMAC_BYTES = 32;
const SECRET_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

type DerivedKeys = {
  encKey: CryptoJS.lib.WordArray;
  macKey: CryptoJS.lib.WordArray;
};

type Pbkdf2Callback = (
  err: Error | null,
  derivedKey?: {toString: (enc: string) => string},
) => void;

const derivationCache = new Map<string, DerivedKeys>();
const inflightDerivations = new Map<string, Promise<DerivedKeys>>();

let quickPbkdf2:
  | ((
      password: string,
      salt: string,
      iterations: number,
      keylen: number,
      digest: string,
      callback: Pbkdf2Callback,
    ) => void)
  | null = null;

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
  const suffix = Array.from(bytes, byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${Date.now()}-${suffix}`;
}

/** Unbiased sampling over SECRET_ALPHABET (rejection sampling). */
export function generateSecret(length = 24): string {
  const alphabetLen = SECRET_ALPHABET.length;
  const maxUnbiased = 256 - (256 % alphabetLen);
  let result = '';
  while (result.length < length) {
    const bytes = getSecureRandomBytes(length - result.length + 8);
    for (let i = 0; i < bytes.length && result.length < length; i += 1) {
      if (bytes[i] < maxUnbiased) {
        result += SECRET_ALPHABET.charAt(bytes[i] % alphabetLen);
      }
    }
  }
  return result;
}

function keysFromPbkdf2Hex(hex: string): DerivedKeys {
  return {
    encKey: CryptoJS.enc.Hex.parse(hex.slice(0, 64)),
    macKey: CryptoJS.enc.Hex.parse(hex.slice(64, 128)),
  };
}

function deriveKeysWithCryptoJs(
  secret: string,
  salt: CryptoJS.lib.WordArray | string,
  iterations: number,
): DerivedKeys {
  const saltWa =
    typeof salt === 'string' ? CryptoJS.enc.Utf8.parse(salt) : salt;
  const derived = CryptoJS.PBKDF2(secret, saltWa, {
    keySize: (32 + 32) / 4,
    iterations,
    hasher: CryptoJS.algo.SHA256,
  });
  return keysFromPbkdf2Hex(derived.toString(CryptoJS.enc.Hex));
}

function deriveV2KeysNative(secret: string): Promise<DerivedKeys> {
  if (!quickPbkdf2) {
    return Promise.resolve(
      deriveKeysWithCryptoJs(secret, PBKDF2_SALT_V2, PBKDF2_ITERATIONS_V2),
    );
  }

  return new Promise((resolve, reject) => {
    quickPbkdf2!(
      secret,
      PBKDF2_SALT_V2,
      PBKDF2_ITERATIONS_V2,
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

function cacheKey(secret: string, version: string, saltId: string): string {
  return `${version}:${saltId}:${secret}`;
}

function rememberDerived(key: string, keys: DerivedKeys): DerivedKeys {
  if (derivationCache.size >= MAX_DERIVATION_CACHE_ENTRIES) {
    const oldest = derivationCache.keys().next().value;
    if (oldest !== undefined) {
      derivationCache.delete(oldest);
    }
  }
  derivationCache.set(key, keys);
  return keys;
}

async function deriveV2Keys(secret: string): Promise<DerivedKeys> {
  const key = cacheKey(secret, 'v2', PBKDF2_SALT_V2);
  const cached = derivationCache.get(key);
  if (cached) {
    return cached;
  }

  const inflight = inflightDerivations.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = deriveV2KeysNative(secret)
    .then(keys => {
      inflightDerivations.delete(key);
      return rememberDerived(key, keys);
    })
    .catch(error => {
      inflightDerivations.delete(key);
      throw error;
    });

  inflightDerivations.set(key, promise);
  return promise;
}

async function deriveV3Keys(
  secret: string,
  saltBytes: Uint8Array,
): Promise<DerivedKeys> {
  const saltHex = Array.from(saltBytes, b =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  const key = cacheKey(secret, 'v3', saltHex);
  const cached = derivationCache.get(key);
  if (cached) {
    return cached;
  }

  const inflight = inflightDerivations.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = Promise.resolve(
    deriveKeysWithCryptoJs(
      secret,
      uint8ArrayToWordArray(saltBytes),
      PBKDF2_ITERATIONS_V3,
    ),
  )
    .then(keys => {
      inflightDerivations.delete(key);
      return rememberDerived(key, keys);
    })
    .catch(error => {
      inflightDerivations.delete(key);
      throw error;
    });

  inflightDerivations.set(key, promise);
  return promise;
}

export async function warmKeyDerivation(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed) {
    return;
  }
  await deriveV2Keys(trimmed);
}

export function clearDerivationCache(): void {
  derivationCache.clear();
  inflightDerivations.clear();
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

const DECRYPT_FAILED =
  'Decryption failed. Check the ciphertext and selected key.';

/** Encrypt with v3 (per-message salt + PBKDF2-SHA256 + AES-256-CBC + HMAC). */
export async function encryptMessage(
  plaintext: string,
  secret: string,
): Promise<string> {
  const salt = getSecureRandomBytes(SALT_BYTES);
  const {encKey, macKey} = await deriveV3Keys(secret, salt);
  const iv = uint8ArrayToWordArray(getSecureRandomBytes(IV_BYTES));
  const encrypted = CryptoJS.AES.encrypt(plaintext, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ciphertext = encrypted.ciphertext;
  const macInput = uint8ArrayToWordArray(salt).concat(iv).concat(ciphertext);
  const mac = CryptoJS.HmacSHA256(macInput, macKey);
  const payload = uint8ArrayToWordArray(salt)
    .concat(iv)
    .concat(ciphertext)
    .concat(mac);
  return `${V3_PREFIX}${CryptoJS.enc.Base64.stringify(payload)}`;
}

async function decryptV3Message(
  ciphertextBase64: string,
  secret: string,
): Promise<string> {
  const bytes = wordArrayToUint8Array(
    CryptoJS.enc.Base64.parse(ciphertextBase64),
  );
  if (bytes.length < SALT_BYTES + IV_BYTES + HMAC_BYTES + 1) {
    throw new Error(DECRYPT_FAILED);
  }

  const salt = bytes.slice(0, SALT_BYTES);
  const iv = uint8ArrayToWordArray(
    bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES),
  );
  const mac = uint8ArrayToWordArray(bytes.slice(bytes.length - HMAC_BYTES));
  const ciphertext = uint8ArrayToWordArray(
    bytes.slice(SALT_BYTES + IV_BYTES, bytes.length - HMAC_BYTES),
  );

  const {encKey, macKey} = await deriveV3Keys(secret, salt);
  const expectedMac = CryptoJS.HmacSHA256(
    uint8ArrayToWordArray(salt).concat(iv).concat(ciphertext),
    macKey,
  );
  if (
    !timingSafeEqual(
      wordArrayToUint8Array(mac),
      wordArrayToUint8Array(expectedMac),
    )
  ) {
    throw new Error(DECRYPT_FAILED);
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({ciphertext});
  const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // HMAC already authenticated the payload; empty plaintext is valid.
  return decrypted.toString(CryptoJS.enc.Utf8);
}

async function decryptV2Message(
  ciphertextBase64: string,
  secret: string,
): Promise<string> {
  const bytes = wordArrayToUint8Array(
    CryptoJS.enc.Base64.parse(ciphertextBase64),
  );
  if (bytes.length < IV_BYTES + HMAC_BYTES + 1) {
    throw new Error(DECRYPT_FAILED);
  }

  const iv = uint8ArrayToWordArray(bytes.slice(0, IV_BYTES));
  const mac = uint8ArrayToWordArray(bytes.slice(bytes.length - HMAC_BYTES));
  const ciphertext = uint8ArrayToWordArray(
    bytes.slice(IV_BYTES, bytes.length - HMAC_BYTES),
  );

  const {encKey, macKey} = await deriveV2Keys(secret);
  const expectedMac = CryptoJS.HmacSHA256(
    iv.clone().concat(ciphertext),
    macKey,
  );
  if (
    !timingSafeEqual(
      wordArrayToUint8Array(mac),
      wordArrayToUint8Array(expectedMac),
    )
  ) {
    throw new Error(DECRYPT_FAILED);
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({ciphertext});
  const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/** Insecure legacy MD5/AES-CBC — only call when user opts in. */
export function decryptLegacyMessage(
  ciphertextBase64: string,
  secret: string,
): string {
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
    throw new Error(DECRYPT_FAILED);
  }
  return plaintext;
}

export type DecryptOptions = {
  /** When true, attempt unauthenticated MD5/AES-CBC for non-v2/v3 ciphertext. */
  allowLegacy?: boolean;
};

export async function decryptMessage(
  ciphertext: string,
  secret: string,
  options: DecryptOptions = {},
): Promise<string> {
  const trimmed = ciphertext.trim();
  if (trimmed.startsWith(V3_PREFIX)) {
    return decryptV3Message(trimmed.slice(V3_PREFIX.length), secret);
  }
  if (trimmed.startsWith(V2_PREFIX)) {
    return decryptV2Message(trimmed.slice(V2_PREFIX.length), secret);
  }
  if (options.allowLegacy) {
    return decryptLegacyMessage(trimmed, secret);
  }
  throw new Error(DECRYPT_FAILED);
}

/** Encrypt a high-entropy wrapping key over a UTF-8 blob (key DB). */
export function encryptWithRawKey(
  plaintext: string,
  rawKeyHex: string,
): string {
  const encKey = CryptoJS.enc.Hex.parse(rawKeyHex.slice(0, 64));
  const macKey = CryptoJS.enc.Hex.parse(
    rawKeyHex.length >= 128
      ? rawKeyHex.slice(64, 128)
      : CryptoJS.SHA256(rawKeyHex).toString(),
  );
  const iv = uint8ArrayToWordArray(getSecureRandomBytes(IV_BYTES));
  const encrypted = CryptoJS.AES.encrypt(plaintext, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ciphertext = encrypted.ciphertext;
  const mac = CryptoJS.HmacSHA256(iv.clone().concat(ciphertext), macKey);
  const payload = iv.clone().concat(ciphertext).concat(mac);
  return `db1:${CryptoJS.enc.Base64.stringify(payload)}`;
}

export function decryptWithRawKey(sealed: string, rawKeyHex: string): string {
  if (!sealed.startsWith('db1:')) {
    throw new Error('Invalid encrypted storage blob');
  }
  const encKey = CryptoJS.enc.Hex.parse(rawKeyHex.slice(0, 64));
  const macKey = CryptoJS.enc.Hex.parse(
    rawKeyHex.length >= 128
      ? rawKeyHex.slice(64, 128)
      : CryptoJS.SHA256(rawKeyHex).toString(),
  );
  const bytes = wordArrayToUint8Array(
    CryptoJS.enc.Base64.parse(sealed.slice(4)),
  );
  if (bytes.length < IV_BYTES + HMAC_BYTES + 1) {
    throw new Error('Invalid encrypted storage blob');
  }
  const iv = uint8ArrayToWordArray(bytes.slice(0, IV_BYTES));
  const mac = uint8ArrayToWordArray(bytes.slice(bytes.length - HMAC_BYTES));
  const ciphertext = uint8ArrayToWordArray(
    bytes.slice(IV_BYTES, bytes.length - HMAC_BYTES),
  );
  const expectedMac = CryptoJS.HmacSHA256(
    iv.clone().concat(ciphertext),
    macKey,
  );
  if (
    !timingSafeEqual(
      wordArrayToUint8Array(mac),
      wordArrayToUint8Array(expectedMac),
    )
  ) {
    throw new Error('Invalid encrypted storage blob');
  }
  const cipherParams = CryptoJS.lib.CipherParams.create({ciphertext});
  const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function generateWrappingKeyHex(): string {
  const bytes = getSecureRandomBytes(64);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
