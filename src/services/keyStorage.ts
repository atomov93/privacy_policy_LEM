import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import {
  decryptWithRawKey,
  encryptWithRawKey,
  generateWrappingKeyHex,
  getFingerprint,
} from './cryptoService';
import {MAX_KEY_NAME_LENGTH, MAX_SECRET_LENGTH} from './limits';
import {SavedKey} from '../types';

const LEGACY_STORAGE_KEY = '@lets_encrypt_app/keys';
const ENCRYPTED_STORAGE_KEY = '@lets_encrypt_app/keys_enc';
const WRAP_KEY_SERVICE = 'lets-encrypt-app.db-wrap-key';

export class KeyStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyStorageError';
  }
}

export function normalizeKeyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeKeyName(a).toLowerCase() === normalizeKeyName(b).toLowerCase();
}

export function fingerprintsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Drop later entries that share a name or fingerprint with an earlier one. */
export function dedupeKeys(keys: SavedKey[]): SavedKey[] {
  const seenNames = new Set<string>();
  const seenFingerprints = new Set<string>();
  const result: SavedKey[] = [];
  for (const key of keys) {
    const nameKey = normalizeKeyName(key.name).toLowerCase();
    const fingerprintKey = key.fingerprint.trim().toLowerCase();
    if (seenNames.has(nameKey) || seenFingerprints.has(fingerprintKey)) {
      continue;
    }
    seenNames.add(nameKey);
    seenFingerprints.add(fingerprintKey);
    result.push(key);
  }
  return result;
}

function normalizeStoredKey(raw: unknown): SavedKey | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const name = typeof record.name === 'string' ? record.name : null;
  const secret = typeof record.secret === 'string' ? record.secret : null;

  if (!id || !name || !secret) {
    return null;
  }

  const normalizedName = normalizeKeyName(name);
  if (
    !normalizedName ||
    normalizedName.length > MAX_KEY_NAME_LENGTH ||
    secret.length > MAX_SECRET_LENGTH
  ) {
    return null;
  }

  const fingerprint =
    typeof record.fingerprint === 'string'
      ? record.fingerprint
      : getFingerprint(secret);

  return {
    id,
    name: normalizedName,
    secret,
    fingerprint,
    createdAt:
      typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
  };
}

function parseKeysJson(raw: string): SavedKey[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new KeyStorageError('Key database is corrupted.');
  }
  return dedupeKeys(
    parsed
      .map(normalizeStoredKey)
      .filter((key): key is SavedKey => key !== null),
  );
}

async function getOrCreateWrappingKey(): Promise<string> {
  try {
    const existing = await Keychain.getGenericPassword({
      service: WRAP_KEY_SERVICE,
    });
    if (existing && typeof existing === 'object' && existing.password) {
      return existing.password;
    }
  } catch {
    // fall through to create
  }

  const wrappingKey = generateWrappingKeyHex();
  try {
    await Keychain.setGenericPassword('db-wrap', wrappingKey, {
      service: WRAP_KEY_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    throw new KeyStorageError(
      'Unable to store encryption key in the device Keychain/Keystore.',
    );
  }
  return wrappingKey;
}

async function persistEncrypted(keys: SavedKey[]): Promise<void> {
  const wrappingKey = await getOrCreateWrappingKey();
  const sealed = encryptWithRawKey(JSON.stringify(keys), wrappingKey);
  await AsyncStorage.setItem(ENCRYPTED_STORAGE_KEY, sealed);
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

/**
 * Load keys from encrypted storage, migrating legacy plaintext once.
 * Distinguishes empty DB from corruption via KeyStorageError.
 */
export async function loadKeys(): Promise<SavedKey[]> {
  const sealed = await AsyncStorage.getItem(ENCRYPTED_STORAGE_KEY);
  if (sealed) {
    try {
      const wrappingKey = await getOrCreateWrappingKey();
      const json = decryptWithRawKey(sealed, wrappingKey);
      const keys = parseKeysJson(json);
      // Persist if fingerprint/name duplicates were collapsed on read.
      const rawParsed = JSON.parse(json) as unknown;
      const rawCount = Array.isArray(rawParsed) ? rawParsed.length : keys.length;
      if (keys.length !== rawCount) {
        try {
          await persistEncrypted(keys);
        } catch {
          // Still return the deduped in-memory list.
        }
      }
      return keys;
    } catch (error) {
      if (error instanceof KeyStorageError) {
        throw error;
      }
      throw new KeyStorageError(
        'Unable to decrypt the key database. Device key material may be unavailable.',
      );
    }
  }

  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    return [];
  }

  // Legacy plaintext migration path
  let keys: SavedKey[];
  try {
    const parsed = JSON.parse(legacy) as unknown;
    if (!Array.isArray(parsed)) {
      // Treat malformed legacy as empty after clearing — avoid blocking the app,
      // but do not silently present corruption as "no keys" without clearing.
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      return [];
    }
    keys = dedupeKeys(
      parsed
        .map(normalizeStoredKey)
        .filter((key): key is SavedKey => key !== null),
    );
  } catch {
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return [];
  }

  try {
    await persistEncrypted(keys);
  } catch {
    // If encryption fails, still return migrated-in-memory keys for this session
    // but leave legacy in place for retry.
  }
  return keys;
}

export async function saveKeys(keys: SavedKey[]): Promise<void> {
  try {
    await persistEncrypted(dedupeKeys(keys));
  } catch (error) {
    if (error instanceof KeyStorageError) {
      throw error;
    }
    throw new KeyStorageError('Unable to save keys to secure storage.');
  }
}

export async function findKeyByName(
  name: string,
): Promise<SavedKey | undefined> {
  const keys = await loadKeys();
  return keys.find(existing => namesMatch(existing.name, name));
}

export async function findKeyByFingerprint(
  fingerprint: string,
): Promise<SavedKey | undefined> {
  const keys = await loadKeys();
  return keys.find(existing =>
    fingerprintsMatch(existing.fingerprint, fingerprint),
  );
}

/** Existing key that collides on display name or secret fingerprint. */
export async function findDuplicateKey(
  name: string,
  fingerprint: string,
): Promise<SavedKey | undefined> {
  const keys = await loadKeys();
  return keys.find(
    existing =>
      namesMatch(existing.name, name) ||
      fingerprintsMatch(existing.fingerprint, fingerprint),
  );
}

export async function addKey(key: SavedKey): Promise<SavedKey[]> {
  const fingerprint =
    typeof key.fingerprint === 'string' && key.fingerprint.length > 0
      ? key.fingerprint
      : getFingerprint(key.secret);
  const normalized: SavedKey = {
    ...key,
    name: normalizeKeyName(key.name),
    fingerprint,
  };
  if (
    !normalized.name ||
    normalized.name.length > MAX_KEY_NAME_LENGTH ||
    normalized.secret.length === 0 ||
    normalized.secret.length > MAX_SECRET_LENGTH
  ) {
    throw new KeyStorageError('Key name or secret exceeds allowed limits.');
  }

  const keys = await loadKeys();
  const filtered = keys.filter(
    existing =>
      !namesMatch(existing.name, normalized.name) &&
      !fingerprintsMatch(existing.fingerprint, normalized.fingerprint),
  );
  const updated = [normalized, ...filtered];
  await saveKeys(updated);
  return updated;
}

export async function deleteKey(id: string): Promise<SavedKey[]> {
  const keys = await loadKeys();
  const updated = keys.filter(key => key.id !== id);
  await saveKeys(updated);
  return updated;
}
