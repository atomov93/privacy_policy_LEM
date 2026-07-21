import CryptoJS from 'crypto-js';

import {
  decryptWithRawKey,
  encryptWithRawKey,
  generateSecureId,
  generateWrappingKeyHex,
  getFingerprint,
} from './cryptoService';
import {
  MAX_KEY_NAME_LENGTH,
  MAX_QR_PAYLOAD_LENGTH,
  MAX_SECRET_LENGTH,
  QR_SCAN_DEBOUNCE_MS,
  QR_TRANSFER_TTL_MS,
} from './limits';
import {KeyQrPayloadV2, SavedKey} from '../types';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function hasControlCharacters(value: string): boolean {
  return CONTROL_CHARS.test(value);
}

export function generateTransferPin(): string {
  // 6-digit PIN from unbiased sampling of 0-9
  const digits = '0123456789';
  const maxUnbiased = 256 - (256 % 10);
  let pin = '';
  while (pin.length < 6) {
    const bytes = new Uint8Array(8);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      const wa = CryptoJS.lib.WordArray.random(8);
      for (let i = 0; i < 8; i += 1) {
        bytes[i] = (wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      }
    }
    for (let i = 0; i < bytes.length && pin.length < 6; i += 1) {
      if (bytes[i] < maxUnbiased) {
        pin += digits.charAt(bytes[i] % 10);
      }
    }
  }
  return pin;
}

function deriveQrKeyMaterial(pin: string, saltHex: string): string {
  const derived = CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 64 / 4,
    iterations: 50_000,
    hasher: CryptoJS.algo.SHA256,
  });
  return derived.toString(CryptoJS.enc.Hex);
}

export type EncodedQrTransfer = {
  payload: string;
  pin: string;
  expiresAt: number;
};

/** Create a PIN-wrapped v2 QR payload (secret never in cleartext). */
export function encodeKeyQrPayload(
  key: Pick<SavedKey, 'name' | 'secret'>,
): EncodedQrTransfer {
  const name = key.name.trim();
  const secret = key.secret.trim();
  if (
    !name ||
    !secret ||
    name.length > MAX_KEY_NAME_LENGTH ||
    secret.length > MAX_SECRET_LENGTH ||
    hasControlCharacters(name)
  ) {
    throw new Error('Invalid key for QR export');
  }

  const pin = generateTransferPin();
  const saltHex = generateWrappingKeyHex().slice(0, 32);
  const rawKey = deriveQrKeyMaterial(pin, saltHex);
  const expiresAt = Date.now() + QR_TRANSFER_TTL_MS;
  const inner = JSON.stringify({name, secret});
  const sealed = encryptWithRawKey(inner, rawKey);
  const payload: KeyQrPayloadV2 = {
    v: 2,
    salt: saltHex,
    exp: expiresAt,
    data: sealed.slice(4), // drop db1: prefix; re-add on decode
  };
  const encoded = JSON.stringify(payload);
  if (encoded.length > MAX_QR_PAYLOAD_LENGTH) {
    throw new Error('QR payload exceeds size limit');
  }
  return {payload: encoded, pin, expiresAt};
}

export function decodeKeyQrPayload(
  raw: string,
  pin?: string,
): Pick<SavedKey, 'name' | 'secret'> | null {
  if (!raw || raw.length > MAX_QR_PAYLOAD_LENGTH) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      v?: number;
      salt?: unknown;
      exp?: unknown;
      data?: unknown;
      name?: unknown;
      secret?: unknown;
    };

    // Reject plaintext v1 payloads entirely.
    if (parsed.v === 1) {
      return null;
    }

    if (
      parsed.v !== 2 ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.data !== 'string' ||
      !pin
    ) {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    const rawKey = deriveQrKeyMaterial(pin, parsed.salt);
    const inner = decryptWithRawKey(`db1:${parsed.data}`, rawKey);
    const body = JSON.parse(inner) as {name?: unknown; secret?: unknown};
    if (typeof body.name !== 'string' || typeof body.secret !== 'string') {
      return null;
    }

    const name = body.name.trim();
    const secret = body.secret.trim();
    if (
      !name ||
      !secret ||
      name.length > MAX_KEY_NAME_LENGTH ||
      secret.length > MAX_SECRET_LENGTH ||
      hasControlCharacters(name)
    ) {
      return null;
    }

    return {name, secret};
  } catch {
    return null;
  }
}

/** Peek whether raw looks like a v2 QR without decrypting. */
export function isEncryptedQrPayload(raw: string): boolean {
  if (!raw || raw.length > MAX_QR_PAYLOAD_LENGTH) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as {v?: unknown};
    return parsed.v === 2;
  } catch {
    return false;
  }
}

export function keyFromQrPayload(
  payload: Pick<SavedKey, 'name' | 'secret'>,
): SavedKey {
  const secret = payload.secret.trim();
  return {
    id: generateSecureId(),
    name: payload.name.trim(),
    secret,
    fingerprint: getFingerprint(secret),
    createdAt: Date.now(),
  };
}

let lastScanAt = 0;
let lastScanValue = '';

/** Returns true if this scan should be processed (debounce duplicate frames). */
export function shouldProcessQrScan(raw: string, now = Date.now()): boolean {
  if (raw === lastScanValue && now - lastScanAt < QR_SCAN_DEBOUNCE_MS) {
    return false;
  }
  lastScanAt = now;
  lastScanValue = raw;
  return true;
}

export function resetQrScanDebounce(): void {
  lastScanAt = 0;
  lastScanValue = '';
}
