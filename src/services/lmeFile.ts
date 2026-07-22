import CryptoJS from 'crypto-js';

import {
  decryptWithRawKey,
  encryptWithRawKey,
  generateSecret,
  generateWrappingKeyHex,
  getFingerprint,
} from './cryptoService';
import {
  LME_DEFAULT_TTL_MS,
  LME_FILE_EXTENSION,
  LME_KDF_ITERATIONS,
  LME_MAGIC,
  LME_MAX_FILE_BYTES,
  LME_MIN_PASSPHRASE_LENGTH,
  MAX_KEY_NAME_LENGTH,
  MAX_SECRET_LENGTH,
} from './limits';
import {hasControlCharacters} from './qrPayload';
import {SavedKey} from '../types';

export type LmeEnvelopeV1 = {
  v: 1;
  fmt: 'letsmessageencrypt.key';
  kdf: 'pbkdf2-sha256';
  iters: number;
  salt: string;
  exp: number;
  data: string;
};

export type LmeDecodedKey = Pick<SavedKey, 'name' | 'secret' | 'fingerprint'>;

export type EncodedLmeFile = {
  contents: string;
  filename: string;
  passphrase: string;
  expiresAt: number;
};

type Pbkdf2Callback = (
  err: Error | null,
  derivedKey?: {toString: (enc: string) => string},
) => void;

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

try {
  quickPbkdf2 = require('react-native-quick-crypto').pbkdf2;
} catch {
  quickPbkdf2 = null;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function deriveLmeKeyMaterialSync(
  passphrase: string,
  saltHex: string,
  iterations: number,
): string {
  const derived = CryptoJS.PBKDF2(
    passphrase,
    CryptoJS.enc.Hex.parse(saltHex),
    {
      keySize: 64 / 4,
      iterations,
      hasher: CryptoJS.algo.SHA256,
    },
  );
  return derived.toString(CryptoJS.enc.Hex);
}

/**
 * Derive 64-byte LME key material. Prefer native async PBKDF2 so the UI
 * thread is not blocked for hundreds of thousands of iterations.
 */
async function deriveLmeKeyMaterial(
  passphrase: string,
  saltHex: string,
  iterations: number = LME_KDF_ITERATIONS,
): Promise<string> {
  if (!quickPbkdf2) {
    return deriveLmeKeyMaterialSync(passphrase, saltHex, iterations);
  }

  return new Promise((resolve, reject) => {
    quickPbkdf2!(
      passphrase,
      hexToBytes(saltHex),
      iterations,
      64,
      'sha256',
      (err, key) => {
        if (err || !key) {
          reject(err ?? new Error('PBKDF2 failed'));
          return;
        }
        resolve(key.toString('hex'));
      },
    );
  });
}

export function generateLmePassphrase(): string {
  // High-entropy transfer secret for remote file sharing (not a short PIN).
  return generateSecret(20);
}

export function sanitizeLmeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const base = cleaned.length > 0 ? cleaned : 'key';
  return `${base}.${LME_FILE_EXTENSION}`;
}

export function isLmeFileContents(raw: string): boolean {
  const trimmed = raw.trimStart();
  return trimmed.startsWith(`${LME_MAGIC}\n`) || trimmed.startsWith(LME_MAGIC);
}

/**
 * Encode a key into an authenticated .lme document.
 * The file is useless without the separate transfer passphrase.
 */
export async function encodeLmeFile(
  key: Pick<SavedKey, 'name' | 'secret'>,
  options: {passphrase?: string; ttlMs?: number} = {},
): Promise<EncodedLmeFile> {
  const name = key.name.trim();
  const secret = key.secret.trim();
  const passphrase = (options.passphrase ?? generateLmePassphrase()).trim();

  if (
    !name ||
    !secret ||
    name.length > MAX_KEY_NAME_LENGTH ||
    secret.length > MAX_SECRET_LENGTH ||
    hasControlCharacters(name)
  ) {
    throw new Error('Invalid key for LME export');
  }
  if (passphrase.length < LME_MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `Transfer passphrase must be at least ${LME_MIN_PASSPHRASE_LENGTH} characters`,
    );
  }

  const salt = generateWrappingKeyHex().slice(0, 64);
  const rawKey = await deriveLmeKeyMaterial(passphrase, salt);
  const expiresAt = Date.now() + (options.ttlMs ?? LME_DEFAULT_TTL_MS);
  const inner = JSON.stringify({
    name,
    secret,
    fingerprint: getFingerprint(secret),
  });
  const sealed = encryptWithRawKey(inner, rawKey);
  const envelope: LmeEnvelopeV1 = {
    v: 1,
    fmt: 'letsmessageencrypt.key',
    kdf: 'pbkdf2-sha256',
    iters: LME_KDF_ITERATIONS,
    salt,
    exp: expiresAt,
    data: sealed.slice(4),
  };
  const contents = `${LME_MAGIC}\n${JSON.stringify(envelope)}\n`;
  if (contents.length > LME_MAX_FILE_BYTES) {
    throw new Error('LME file exceeds size limit');
  }
  return {
    contents,
    filename: sanitizeLmeFilename(name),
    passphrase,
    expiresAt,
  };
}

export async function decodeLmeFile(
  raw: string,
  passphrase: string,
): Promise<LmeDecodedKey | null> {
  if (!raw || raw.length > LME_MAX_FILE_BYTES) {
    return null;
  }
  const trimmedPass = passphrase.trim();
  if (trimmedPass.length < LME_MIN_PASSPHRASE_LENGTH) {
    return null;
  }

  try {
    let body = raw.trim();
    if (body.startsWith(`${LME_MAGIC}\n`)) {
      body = body.slice(LME_MAGIC.length + 1).trim();
    } else if (body.startsWith(LME_MAGIC)) {
      body = body.slice(LME_MAGIC.length).trim();
    } else {
      return null;
    }

    const parsed = JSON.parse(body) as Partial<LmeEnvelopeV1>;
    if (
      parsed.v !== 1 ||
      parsed.fmt !== 'letsmessageencrypt.key' ||
      parsed.kdf !== 'pbkdf2-sha256' ||
      typeof parsed.iters !== 'number' ||
      parsed.iters < LME_KDF_ITERATIONS ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.data !== 'string'
    ) {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }

    const rawKey = await deriveLmeKeyMaterial(
      trimmedPass,
      parsed.salt,
      parsed.iters,
    );
    const inner = decryptWithRawKey(`db1:${parsed.data}`, rawKey);
    const payload = JSON.parse(inner) as {
      name?: unknown;
      secret?: unknown;
      fingerprint?: unknown;
    };
    if (typeof payload.name !== 'string' || typeof payload.secret !== 'string') {
      return null;
    }
    const name = payload.name.trim();
    const secret = payload.secret.trim();
    if (
      !name ||
      !secret ||
      name.length > MAX_KEY_NAME_LENGTH ||
      secret.length > MAX_SECRET_LENGTH ||
      hasControlCharacters(name)
    ) {
      return null;
    }
    const fingerprint =
      typeof payload.fingerprint === 'string' && payload.fingerprint.length > 0
        ? payload.fingerprint
        : getFingerprint(secret);
    return {name, secret, fingerprint};
  } catch {
    return null;
  }
}
