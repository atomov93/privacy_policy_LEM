import {generateSecureId, getFingerprint} from './cryptoService';
import {KeyQrPayload, SavedKey} from '../types';

export function encodeKeyQrPayload(key: Pick<SavedKey, 'name' | 'secret'>): string {
  const payload: KeyQrPayload = {
    v: 1,
    name: key.name,
    secret: key.secret,
  };
  return JSON.stringify(payload);
}

export function decodeKeyQrPayload(
  raw: string,
): Pick<SavedKey, 'name' | 'secret'> | null {
  try {
    const parsed = JSON.parse(raw) as Partial<KeyQrPayload>;
    if (
      parsed.v === 1 &&
      typeof parsed.name === 'string' &&
      typeof parsed.secret === 'string' &&
      parsed.name.trim().length > 0 &&
      parsed.secret.trim().length > 0
    ) {
      return {
        name: parsed.name.trim(),
        secret: parsed.secret.trim(),
      };
    }
  } catch {
    // fall through
  }
  return null;
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
