import CryptoJS from 'crypto-js';

import {
  decryptWithRawKey,
  encryptWithRawKey,
  generateWrappingKeyHex,
} from '../src/services/cryptoService';
import {
  decodeLmeFile,
  encodeLmeFile,
  generateLmePassphrase,
  isLmeFileContents,
  sanitizeLmeFilename,
} from '../src/services/lmeFile';
import {
  LME_KDF_ITERATIONS,
  LME_MAGIC,
  LME_MAX_FILE_BYTES,
  LME_MIN_PASSPHRASE_LENGTH,
  MAX_KEY_NAME_LENGTH,
  MAX_SECRET_LENGTH,
} from '../src/services/limits';

function deriveLmeKeyMaterial(passphrase: string, saltHex: string): string {
  const derived = CryptoJS.PBKDF2(
    passphrase,
    CryptoJS.enc.Hex.parse(saltHex),
    {
      keySize: 64 / 4,
      iterations: LME_KDF_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    },
  );
  return derived.toString(CryptoJS.enc.Hex);
}

function buildLmeContents(
  inner: Record<string, unknown>,
  passphrase: string,
  overrides: Record<string, unknown> = {},
  options: {withNewline?: boolean} = {},
): string {
  const salt = generateWrappingKeyHex().slice(0, 64);
  const rawKey = deriveLmeKeyMaterial(passphrase, salt);
  const sealed = encryptWithRawKey(JSON.stringify(inner), rawKey);
  const envelope = {
    v: 1,
    fmt: 'letsmessageencrypt.key',
    kdf: 'pbkdf2-sha256',
    iters: LME_KDF_ITERATIONS,
    salt,
    exp: Date.now() + 60_000,
    data: sealed.slice(4),
    ...overrides,
  };
  const body = JSON.stringify(envelope);
  if (options.withNewline === false) {
    return `${LME_MAGIC}${body}`;
  }
  return `${LME_MAGIC}\n${body}\n`;
}

describe('lme encrypted key files', () => {
  it('round-trips a key with the transfer passphrase', async () => {
    const encoded = await encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    expect(encoded.contents.startsWith(`${LME_MAGIC}\n`)).toBe(true);
    expect(encoded.passphrase.length).toBeGreaterThanOrEqual(
      LME_MIN_PASSPHRASE_LENGTH,
    );
    expect(encoded.filename.endsWith('.lme')).toBe(true);
    expect(encoded.contents).not.toContain('shared-secret');
    expect(
      JSON.parse(encoded.contents.slice(LME_MAGIC.length + 1)).secret,
    ).toBeUndefined();

    const decoded = await decodeLmeFile(encoded.contents, encoded.passphrase);
    expect(decoded).toEqual(
      expect.objectContaining({
        name: 'Alice',
        secret: 'shared-secret',
      }),
    );
  });

  it('rejects the wrong passphrase', async () => {
    const encoded = await encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    await expect(
      decodeLmeFile(encoded.contents, 'wrong-passphrase!!!!'),
    ).resolves.toBeNull();
  });

  it('rejects expired files', async () => {
    const encoded = await encodeLmeFile(
      {name: 'Alice', secret: 'shared-secret'},
      {ttlMs: -1000},
    );
    await expect(
      decodeLmeFile(encoded.contents, encoded.passphrase),
    ).resolves.toBeNull();
  });

  it('rejects short passphrases on encode and decode', async () => {
    await expect(
      encodeLmeFile(
        {name: 'Alice', secret: 'shared-secret'},
        {passphrase: 'short'},
      ),
    ).rejects.toThrow(/at least/);
    const encoded = await encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    await expect(decodeLmeFile(encoded.contents, 'short')).resolves.toBeNull();
  });

  it('detects LME magic and sanitizes filenames', () => {
    expect(isLmeFileContents(`${LME_MAGIC}\n{}`)).toBe(true);
    expect(isLmeFileContents(`${LME_MAGIC}{}`)).toBe(true);
    expect(isLmeFileContents('not-lme')).toBe(false);
    expect(sanitizeLmeFilename('My Key!!')).toBe('My-Key.lme');
    expect(sanitizeLmeFilename('!!!')).toBe('key.lme');
    expect(generateLmePassphrase()).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('rejects control characters in names', async () => {
    await expect(
      encodeLmeFile({name: 'Alice\u0000', secret: 'shared-secret'}),
    ).rejects.toThrow();
  });

  it('rejects empty or oversized raw input', async () => {
    await expect(decodeLmeFile('', 'long-enough-passphrase')).resolves.toBeNull();
    await expect(
      decodeLmeFile('x'.repeat(LME_MAX_FILE_BYTES + 1), 'long-enough-passphrase'),
    ).resolves.toBeNull();
  });

  it('decodes magic without a trailing newline', async () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
      {},
      {withNewline: false},
    );
    await expect(decodeLmeFile(contents, passphrase)).resolves.toEqual(
      expect.objectContaining({name: 'Alice', secret: 'shared-secret'}),
    );
  });

  it('rejects envelopes with downgraded KDF iterations', async () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
      {iters: LME_KDF_ITERATIONS - 1},
    );
    await expect(decodeLmeFile(contents, passphrase)).resolves.toBeNull();
  });

  it('rejects malformed envelope fields', async () => {
    const passphrase = 'long-enough-passphrase';
    await expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {v: 2}),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {
          fmt: 'other',
        }),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {
          kdf: 'scrypt',
        }),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(`${LME_MAGIC}\n{"not":"valid-json"`, passphrase),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(`${LME_MAGIC}\nnull\n`, passphrase),
    ).resolves.toBeNull();
  });

  it('rejects bit-flipped authenticated ciphertext', async () => {
    const encoded = await encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    const body = JSON.parse(encoded.contents.slice(LME_MAGIC.length + 1));
    const words = CryptoJS.enc.Base64.parse(body.data);
    words.words[0] ^= 0xff000000;
    body.data = CryptoJS.enc.Base64.stringify(words);
    const tampered = `${LME_MAGIC}\n${JSON.stringify(body)}\n`;
    await expect(
      decodeLmeFile(tampered, encoded.passphrase),
    ).resolves.toBeNull();
  });

  it('rejects decrypted payloads with invalid names or secrets', async () => {
    const passphrase = 'long-enough-passphrase';
    await expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'Alice\u0000', secret: 'shared-secret'},
          passphrase,
        ),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'A'.repeat(MAX_KEY_NAME_LENGTH + 1), secret: 'shared-secret'},
          passphrase,
        ),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'Alice', secret: 's'.repeat(MAX_SECRET_LENGTH + 1)},
          passphrase,
        ),
        passphrase,
      ),
    ).resolves.toBeNull();
    await expect(
      decodeLmeFile(
        buildLmeContents({name: 1, secret: 'shared-secret'}, passphrase),
        passphrase,
      ),
    ).resolves.toBeNull();
  });

  it('computes a fingerprint when the inner payload omits one', async () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
    );
    const decoded = await decodeLmeFile(contents, passphrase);
    expect(decoded?.fingerprint).toHaveLength(64);
  });

  it('rejects encoding oversized keys', async () => {
    await expect(
      encodeLmeFile({
        name: 'A'.repeat(MAX_KEY_NAME_LENGTH + 1),
        secret: 'shared-secret',
      }),
    ).rejects.toThrow(/Invalid key/);
    await expect(
      encodeLmeFile({name: '', secret: 'shared-secret'}),
    ).rejects.toThrow(/Invalid key/);
  });
});

describe('lme sealed payload integrity helper', () => {
  it('round-trips through the same raw-key helpers used by LME', () => {
    const key = generateWrappingKeyHex();
    const sealed = encryptWithRawKey('{"ok":true}', key);
    expect(decryptWithRawKey(sealed, key)).toBe('{"ok":true}');
  });
});
