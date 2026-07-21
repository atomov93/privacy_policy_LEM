import AsyncStorage from '@react-native-async-storage/async-storage';

import { addKey, loadKeys } from '../src/services/keyStorage';
import { getFingerprint } from '../src/services/cryptoService';
import { SavedKey } from '../src/types';

const STORAGE_KEY = '@lets_encrypt_app/keys';
const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

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

describe('key storage corruption and migrations', () => {
  beforeEach(async () => {
    await storage.clear();
    jest.clearAllMocks();
  });

  it.each([
    ['truncated JSON', '[{"id":"broken"'],
    ['JSON object instead of an array', '{"id":"key-1"}'],
    ['JSON null', 'null'],
  ])('does not crash when storage contains %s', async (_label, raw) => {
    await storage.setItem(STORAGE_KEY, raw);
    await expect(loadKeys()).resolves.toEqual([]);
  });

  it('drops malformed records while preserving valid records', async () => {
    const valid = savedKey();
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        valid,
        null,
        {},
        { id: 'missing-secret', name: 'Broken' },
        { id: 123, name: 'Wrong type', secret: 'secret' },
      ]),
    );
    await expect(loadKeys()).resolves.toEqual([valid]);
  });

  it('migrates legacy records missing fingerprint and createdAt', async () => {
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'legacy-1', name: 'Legacy', secret: 'legacy-secret' },
      ]),
    );
    const [migrated] = await loadKeys();
    expect(migrated).toMatchObject({
      id: 'legacy-1',
      name: 'Legacy',
      secret: 'legacy-secret',
      fingerprint: getFingerprint('legacy-secret'),
    });
    expect(migrated.createdAt).toEqual(expect.any(Number));
  });

  it('preserves an existing legacy MD5 fingerprint', async () => {
    const fingerprint = '5d41402abc4b2a76b9719d911017c592';
    await storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy-2',
          name: 'Legacy',
          secret: 'hello',
          fingerprint,
          createdAt: 123,
        },
      ]),
    );
    await expect(loadKeys()).resolves.toEqual([
      expect.objectContaining({ fingerprint }),
    ]);
  });
});

describe('duplicate-key replacement', () => {
  beforeEach(async () => {
    await storage.clear();
    jest.clearAllMocks();
  });

  it('replaces a duplicate name case-insensitively and keeps other keys', async () => {
    const original = savedKey({
      id: 'old',
      name: 'Alice',
      secret: 'old-secret',
    });
    const other = savedKey({ id: 'other', name: 'Bob' });
    await storage.setItem(STORAGE_KEY, JSON.stringify([original, other]));
    const replacement = savedKey({
      id: 'new',
      name: 'aLiCe',
      secret: 'new-secret',
      fingerprint: getFingerprint('new-secret'),
    });
    const result = await addKey(replacement);
    expect(result).toEqual([replacement, other]);
    expect(result).not.toContainEqual(original);
    expect(JSON.parse((await storage.getItem(STORAGE_KEY))!)).toEqual(result);
  });

  it.failing(
    'normalizes surrounding whitespace before duplicate matching',
    async () => {
      const original = savedKey({ id: 'old', name: 'Alice' });
      await storage.setItem(STORAGE_KEY, JSON.stringify([original]));
      const replacement = savedKey({ id: 'new', name: ' Alice ' });
      expect(await addKey(replacement)).toEqual([replacement]);
    },
  );
});
