import AsyncStorage from '@react-native-async-storage/async-storage';

import {getFingerprint} from './cryptoService';
import {SavedKey} from '../types';

const STORAGE_KEY = '@lets_encrypt_app/keys';

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

  const fingerprint =
    typeof record.fingerprint === 'string'
      ? record.fingerprint
      : getFingerprint(secret);

  return {
    id,
    name,
    secret,
    fingerprint,
    createdAt:
      typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
  };
}

export async function loadKeys(): Promise<SavedKey[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeStoredKey)
      .filter((key): key is SavedKey => key !== null);
  } catch {
    return [];
  }
}

export async function saveKeys(keys: SavedKey[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export async function addKey(key: SavedKey): Promise<SavedKey[]> {
  const keys = await loadKeys();
  const filtered = keys.filter(
    existing => existing.name.toLowerCase() !== key.name.toLowerCase(),
  );
  const updated = [key, ...filtered];
  await saveKeys(updated);
  return updated;
}

export async function deleteKey(id: string): Promise<SavedKey[]> {
  const keys = await loadKeys();
  const updated = keys.filter(key => key.id !== id);
  await saveKeys(updated);
  return updated;
}
