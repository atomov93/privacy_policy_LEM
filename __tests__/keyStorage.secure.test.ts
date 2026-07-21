import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import {addKey, deleteKey, loadKeys, saveKeys} from '../src/services/keyStorage';
import {getFingerprint} from '../src/services/cryptoService';
import {SavedKey} from '../src/types';

const ENCRYPTED_STORAGE_KEY = '@lets_encrypt_app/keys_enc';
const LEGACY_STORAGE_KEY = '@lets_encrypt_app/keys';
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;

function savedKey(overrides: Partial<SavedKey> = {}): SavedKey {
  const secret = overrides.secret ?? 'correct horse battery staple';
  return {
    id: 'key-1',
    name: 'Alice',
    secret,
    fingerprint: getFingerprint(secret),
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('encrypted key storage', () => {
  beforeEach(async () => {
    await storage.clear();
    jest.clearAllMocks();
  });

  it('persists keys as an encrypted blob rather than plaintext JSON', async () => {
    const key = savedKey();
    await addKey(key);
    const sealed = await storage.getItem(ENCRYPTED_STORAGE_KEY);
    expect(sealed).toMatch(/^db1:/);
    expect(sealed).not.toContain(key.secret);
    expect(await storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    await expect(loadKeys()).resolves.toEqual([key]);
  });

  it('migrates plaintext legacy storage into the encrypted blob', async () => {
    const key = savedKey();
    await storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([key]));
    const loaded = await loadKeys();
    expect(loaded).toEqual([key]);
    expect(await storage.getItem(ENCRYPTED_STORAGE_KEY)).toMatch(/^db1:/);
    expect(await storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('surfaces corruption of the encrypted blob', async () => {
    await storage.setItem(ENCRYPTED_STORAGE_KEY, 'db1:not-valid');
    await expect(loadKeys()).rejects.toThrow(/decrypt|Invalid|Unable/i);
  });

  it('deletes keys through encrypted persistence', async () => {
    const a = savedKey({id: 'a', name: 'A'});
    const b = savedKey({id: 'b', name: 'B'});
    await saveKeys([a, b]);
    await expect(deleteKey('a')).resolves.toEqual([b]);
    await expect(loadKeys()).resolves.toEqual([b]);
  });

  it('throws when Keychain cannot store the wrapping key', async () => {
    setGenericPassword.mockRejectedValueOnce(new Error('denied'));
    await expect(saveKeys([savedKey()])).rejects.toThrow(
      /Keychain|Keystore/i,
    );
  });
});
