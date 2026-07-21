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
  it('round-trips a key with the transfer passphrase', () => {
    const encoded = encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    expect(encoded.contents.startsWith(`${LME_MAGIC}\n`)).toBe(true);
    expect(encoded.passphrase.length).toBeGreaterThanOrEqual(
      LME_MIN_PASSPHRASE_LENGTH,
    );
    expect(encoded.filename.endsWith('.lme')).toBe(true);
    expect(encoded.contents).not.toContain('shared-secret');
    expect(JSON.parse(encoded.contents.slice(LME_MAGIC.length + 1)).secret).toBeUndefined();

    const decoded = decodeLmeFile(encoded.contents, encoded.passphrase);
    expect(decoded).toEqual(
      expect.objectContaining({
        name: 'Alice',
        secret: 'shared-secret',
      }),
    );
  });

  it('rejects the wrong passphrase', () => {
    const encoded = encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    expect(decodeLmeFile(encoded.contents, 'wrong-passphrase!!!!')).toBeNull();
  });

  it('rejects expired files', () => {
    const encoded = encodeLmeFile(
      {name: 'Alice', secret: 'shared-secret'},
      {ttlMs: -1000},
    );
    expect(decodeLmeFile(encoded.contents, encoded.passphrase)).toBeNull();
  });

  it('rejects short passphrases on encode and decode', () => {
    expect(() =>
      encodeLmeFile(
        {name: 'Alice', secret: 'shared-secret'},
        {passphrase: 'short'},
      ),
    ).toThrow(/at least/);
    const encoded = encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    expect(decodeLmeFile(encoded.contents, 'short')).toBeNull();
  });

  it('detects LME magic and sanitizes filenames', () => {
    expect(isLmeFileContents(`${LME_MAGIC}\n{}`)).toBe(true);
    expect(isLmeFileContents(`${LME_MAGIC}{}`)).toBe(true);
    expect(isLmeFileContents('not-lme')).toBe(false);
    expect(sanitizeLmeFilename('My Key!!')).toBe('My-Key.lme');
    expect(sanitizeLmeFilename('!!!')).toBe('key.lme');
    expect(generateLmePassphrase()).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('rejects control characters in names', () => {
    expect(() =>
      encodeLmeFile({name: 'Alice\u0000', secret: 'shared-secret'}),
    ).toThrow();
  });

  it('rejects empty or oversized raw input', () => {
    expect(decodeLmeFile('', 'long-enough-passphrase')).toBeNull();
    expect(
      decodeLmeFile('x'.repeat(LME_MAX_FILE_BYTES + 1), 'long-enough-passphrase'),
    ).toBeNull();
  });

  it('decodes magic without a trailing newline', () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
      {},
      {withNewline: false},
    );
    expect(decodeLmeFile(contents, passphrase)).toEqual(
      expect.objectContaining({name: 'Alice', secret: 'shared-secret'}),
    );
  });

  it('rejects envelopes with downgraded KDF iterations', () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
      {iters: LME_KDF_ITERATIONS - 1},
    );
    expect(decodeLmeFile(contents, passphrase)).toBeNull();
  });

  it('rejects malformed envelope fields', () => {
    const passphrase = 'long-enough-passphrase';
    expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {v: 2}),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {
          fmt: 'other',
        }),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(
        buildLmeContents({name: 'A', secret: 's'}, passphrase, {
          kdf: 'scrypt',
        }),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(`${LME_MAGIC}\n{"not":"valid-json"`, passphrase),
    ).toBeNull();
    expect(decodeLmeFile(`${LME_MAGIC}\nnull\n`, passphrase)).toBeNull();
  });

  it('rejects bit-flipped authenticated ciphertext', () => {
    const encoded = encodeLmeFile({name: 'Alice', secret: 'shared-secret'});
    const body = JSON.parse(encoded.contents.slice(LME_MAGIC.length + 1));
    const flipped = Buffer.from(body.data, 'base64');
    flipped[0] ^= 0xff;
    body.data = flipped.toString('base64');
    const tampered = `${LME_MAGIC}\n${JSON.stringify(body)}\n`;
    expect(decodeLmeFile(tampered, encoded.passphrase)).toBeNull();
  });

  it('rejects decrypted payloads with invalid names or secrets', () => {
    const passphrase = 'long-enough-passphrase';
    expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'Alice\u0000', secret: 'shared-secret'},
          passphrase,
        ),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'A'.repeat(MAX_KEY_NAME_LENGTH + 1), secret: 'shared-secret'},
          passphrase,
        ),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(
        buildLmeContents(
          {name: 'Alice', secret: 's'.repeat(MAX_SECRET_LENGTH + 1)},
          passphrase,
        ),
        passphrase,
      ),
    ).toBeNull();
    expect(
      decodeLmeFile(
        buildLmeContents({name: 1, secret: 'shared-secret'}, passphrase),
        passphrase,
      ),
    ).toBeNull();
  });

  it('computes a fingerprint when the inner payload omits one', () => {
    const passphrase = 'long-enough-passphrase';
    const contents = buildLmeContents(
      {name: 'Alice', secret: 'shared-secret'},
      passphrase,
    );
    const decoded = decodeLmeFile(contents, passphrase);
    expect(decoded?.fingerprint).toHaveLength(64);
  });

  it('rejects encoding oversized keys', () => {
    expect(() =>
      encodeLmeFile({
        name: 'A'.repeat(MAX_KEY_NAME_LENGTH + 1),
        secret: 'shared-secret',
      }),
    ).toThrow(/Invalid key/);
    expect(() =>
      encodeLmeFile({name: '', secret: 'shared-secret'}),
    ).toThrow(/Invalid key/);
  });
});

describe('lme sealed payload integrity helper', () => {
  it('round-trips through the same raw-key helpers used by LME', () => {
    const key = generateWrappingKeyHex();
    const sealed = encryptWithRawKey('{"ok":true}', key);
    expect(decryptWithRawKey(sealed, key)).toBe('{"ok":true}');
  });
});
