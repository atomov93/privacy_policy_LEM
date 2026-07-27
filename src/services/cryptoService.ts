import CryptoJS from 'crypto-js';

import {MAX_DERIVATION_CACHE_ENTRIES} from './limits';

const PBKDF2_ITERATIONS_V2 = 100_000;
const PBKDF2_SALT_V2 = 'lets-encrypt-app:v2';
const PBKDF2_ITERATIONS_V3 = 100_000;
/** One-time password stretching for v4; per-message keys use HKDF. */
const PBKDF2_ITERATIONS_V4 = 100_000;
const PBKDF2_SALT_V4 = 'lets-encrypt-app:v4';
const HKDF_INFO_V4 = 'lets-encrypt-app:v4:msg';
export const V2_PREFIX = 'v2:';
export const V3_PREFIX = 'v3:';
export const V4_PREFIX = 'v4:';
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
const masterKeyCache = new Map<string, CryptoJS.lib.WordArray>();
const inflightDerivations = new Map<string, Promise<DerivedKeys>>();
const inflightMasters = new Map<string, Promise<CryptoJS.lib.WordArray>>();

let quickPbkdf2:
  | ((
      password: string,
      salt: string | Uint8Array,
      iterations: number,
      keylen: number,
      digest: string,
      callback: Pbkdf2Callback,
    ) => void)
  | null = null;

let quickHkdfSync:
  | ((
      digest: string,
      key: string | Uint8Array,
      salt: string | Uint8Array,
      info: string | Uint8Array,
      keylen: number,
    ) => Uint8Array | {toString: (enc: string) => string})
  | null = null;

try {
  const quickCrypto = require('react-native-quick-crypto');
  quickPbkdf2 = quickCrypto.pbkdf2;
  quickHkdfSync = quickCrypto.hkdfSync;
} catch {
  quickPbkdf2 = null;
  quickHkdfSync = null;
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

function masterFromPbkdf2Hex(hex: string): CryptoJS.lib.WordArray {
  return CryptoJS.enc.Hex.parse(hex);
}

function pbkdf2Native(
  secret: string,
  salt: string | Uint8Array,
  iterations: number,
  keylen: number,
): Promise<string> {
  if (!quickPbkdf2) {
    const saltWa =
      typeof salt === 'string'
        ? CryptoJS.enc.Utf8.parse(salt)
        : uint8ArrayToWordArray(salt);
    const derived = CryptoJS.PBKDF2(secret, saltWa, {
      keySize: keylen / 4,
      iterations,
      hasher: CryptoJS.algo.SHA256,
    });
    return Promise.resolve(derived.toString(CryptoJS.enc.Hex));
  }

  return new Promise((resolve, reject) => {
    quickPbkdf2!(secret, salt, iterations, keylen, 'sha256', (err, key) => {
      if (err || !key) {
        reject(err ?? new Error('PBKDF2 failed'));
        return;
      }
      resolve(key.toString('hex'));
    });
  });
}

function deriveV2KeysNative(secret: string): Promise<DerivedKeys> {
  return pbkdf2Native(
    secret,
    PBKDF2_SALT_V2,
    PBKDF2_ITERATIONS_V2,
    64,
  ).then(keysFromPbkdf2Hex);
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

function rememberMaster(
  key: string,
  master: CryptoJS.lib.WordArray,
): CryptoJS.lib.WordArray {
  if (masterKeyCache.size >= MAX_DERIVATION_CACHE_ENTRIES) {
    const oldest = masterKeyCache.keys().next().value;
    if (oldest !== undefined) {
      masterKeyCache.delete(oldest);
    }
  }
  masterKeyCache.set(key, master);
  return master;
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

  // Prefer native PBKDF2 — CryptoJS at 100k iters blocks the JS thread hard.
  const promise = pbkdf2Native(
    secret,
    saltBytes,
    PBKDF2_ITERATIONS_V3,
    64,
  )
    .then(hex => {
      inflightDerivations.delete(key);
      return rememberDerived(key, keysFromPbkdf2Hex(hex));
    })
    .catch(error => {
      inflightDerivations.delete(key);
      throw error;
    });

  inflightDerivations.set(key, promise);
  return promise;
}

/** RFC 5869 HKDF-SHA256 (extract + expand) using CryptoJS. */
function hkdfSha256CryptoJs(
  ikm: CryptoJS.lib.WordArray,
  salt: CryptoJS.lib.WordArray,
  info: CryptoJS.lib.WordArray,
  length: number,
): CryptoJS.lib.WordArray {
  const prk = CryptoJS.HmacSHA256(ikm, salt);
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  let okm = CryptoJS.lib.WordArray.create();
  let previous = CryptoJS.lib.WordArray.create();
  for (let i = 1; i <= n; i += 1) {
    const block = CryptoJS.HmacSHA256(
      previous.concat(info).concat(CryptoJS.lib.WordArray.create([i << 24], 1)),
      prk,
    );
    okm = okm.concat(block);
    previous = block;
  }
  okm.sigBytes = length;
  okm.clamp();
  return okm;
}

function hkdfToKeys(
  master: CryptoJS.lib.WordArray,
  saltBytes: Uint8Array,
): DerivedKeys {
  const saltWa = uint8ArrayToWordArray(saltBytes);
  const infoWa = CryptoJS.enc.Utf8.parse(HKDF_INFO_V4);

  if (quickHkdfSync) {
    try {
      const masterBytes = wordArrayToUint8Array(master);
      const derived = quickHkdfSync(
        'sha256',
        masterBytes,
        saltBytes,
        HKDF_INFO_V4,
        64,
      );
      const hex =
        typeof (derived as {toString?: (enc: string) => string}).toString ===
        'function'
          ? (derived as {toString: (enc: string) => string}).toString('hex')
          : Array.from(derived as Uint8Array, b =>
              b.toString(16).padStart(2, '0'),
            ).join('');
      return keysFromPbkdf2Hex(hex);
    } catch {
      // Fall through to CryptoJS HKDF.
    }
  }

  const okm = hkdfSha256CryptoJs(master, saltWa, infoWa, 64);
  return keysFromPbkdf2Hex(okm.toString(CryptoJS.enc.Hex));
}

async function deriveV4Master(secret: string): Promise<CryptoJS.lib.WordArray> {
  const key = cacheKey(secret, 'v4-master', PBKDF2_SALT_V4);
  const cached = masterKeyCache.get(key);
  if (cached) {
    return cached;
  }

  const inflight = inflightMasters.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = pbkdf2Native(
    secret,
    PBKDF2_SALT_V4,
    PBKDF2_ITERATIONS_V4,
    64,
  )
    .then(hex => {
      inflightMasters.delete(key);
      return rememberMaster(key, masterFromPbkdf2Hex(hex));
    })
    .catch(error => {
      inflightMasters.delete(key);
      throw error;
    });

  inflightMasters.set(key, promise);
  return promise;
}

async function deriveV4Keys(
  secret: string,
  saltBytes: Uint8Array,
): Promise<DerivedKeys> {
  const master = await deriveV4Master(secret);
  return hkdfToKeys(master, saltBytes);
}

/**
 * Warm the cacheable KDF paths for the selected secret so the first
 * encrypt/decrypt is not blocked on 100k PBKDF2 iterations.
 */
export async function warmKeyDerivation(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed) {
    return;
  }
  await Promise.all([deriveV4Master(trimmed), deriveV2Keys(trimmed)]);
}

export function clearDerivationCache(): void {
  derivationCache.clear();
  masterKeyCache.clear();
  inflightDerivations.clear();
  inflightMasters.clear();
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

function sealAuthenticated(
  plaintext: string,
  salt: Uint8Array,
  encKey: CryptoJS.lib.WordArray,
  macKey: CryptoJS.lib.WordArray,
  prefix: string,
): string {
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
  return `${prefix}${CryptoJS.enc.Base64.stringify(payload)}`;
}

async function openAuthenticated(
  ciphertextBase64: string,
  secret: string,
  derive: (secret: string, salt: Uint8Array) => Promise<DerivedKeys>,
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

  const {encKey, macKey} = await derive(secret, salt);
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

/**
 * Encrypt with v4: one cached PBKDF2 master + per-message HKDF, then
 * AES-256-CBC + HMAC-SHA256. Same security goals as v3 without paying
 * 100k PBKDF2 iterations on every message.
 */
export async function encryptMessage(
  plaintext: string,
  secret: string,
): Promise<string> {
  const salt = getSecureRandomBytes(SALT_BYTES);
  const {encKey, macKey} = await deriveV4Keys(secret, salt);
  return sealAuthenticated(plaintext, salt, encKey, macKey, V4_PREFIX);
}

async function decryptV4Message(
  ciphertextBase64: string,
  secret: string,
): Promise<string> {
  return openAuthenticated(ciphertextBase64, secret, deriveV4Keys);
}

async function decryptV3Message(
  ciphertextBase64: string,
  secret: string,
): Promise<string> {
  return openAuthenticated(ciphertextBase64, secret, deriveV3Keys);
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
  /** When true, attempt unauthenticated MD5/AES-CBC for non-v2/v3/v4 ciphertext. */
  allowLegacy?: boolean;
};

export async function decryptMessage(
  ciphertext: string,
  secret: string,
  options: DecryptOptions = {},
): Promise<string> {
  const trimmed = ciphertext.trim();
  if (trimmed.startsWith(V4_PREFIX)) {
    return decryptV4Message(trimmed.slice(V4_PREFIX.length), secret);
  }
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
