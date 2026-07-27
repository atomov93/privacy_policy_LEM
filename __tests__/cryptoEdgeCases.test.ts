import CryptoJS from 'crypto-js';

import {
  decryptMessage,
  encryptMessage,
  V2_PREFIX,
  V3_PREFIX,
  V4_PREFIX,
} from '../src/services/cryptoService';

function encryptLegacy(plaintext: string, secret: string): string {
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.MD5(secret), {
    iv: CryptoJS.MD5(`${secret}:iv`),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

describe('Unicode and empty-message handling', () => {
  it.each([
    'Zażółć gęślą jaźń',
    '你好，世界',
    'مرحبا بالعالم',
    '👩🏽‍💻🔐\nline two\t終',
    'e\u0301 and é are distinct Unicode sequences',
  ])('round-trips Unicode: %s', async plaintext => {
    const encrypted = await encryptMessage(plaintext, 'unicode-secret');
    await expect(decryptMessage(encrypted, 'unicode-secret')).resolves.toBe(
      plaintext,
    );
  });

  it('round-trips an empty message', async () => {
    const encrypted = await encryptMessage('', 'empty-message-secret');
    expect(encrypted.startsWith(V4_PREFIX)).toBe(true);
    await expect(
      decryptMessage(encrypted, 'empty-message-secret'),
    ).resolves.toBe('');
  });

  it('does not trim plaintext whitespace', async () => {
    const plaintext = '  leading and trailing  \n';
    const encrypted = await encryptMessage(plaintext, 'whitespace-secret');
    await expect(decryptMessage(encrypted, 'whitespace-secret')).resolves.toBe(
      plaintext,
    );
  });
});

describe('legacy ciphertext edge cases', () => {
  it('decrypts valid legacy ciphertext surrounded by whitespace when allowed', async () => {
    const ciphertext = encryptLegacy('legacy text', 'legacy-secret');
    await expect(
      decryptMessage(`\n ${ciphertext} \t`, 'legacy-secret', {
        allowLegacy: true,
      }),
    ).resolves.toBe('legacy text');
  });

  it.each([
    '',
    'not-base64!!!',
    'AA==',
    'v2:',
    'v2:not-base64!!!',
    'v3:',
    'v4:',
  ])('rejects malformed ciphertext %j', async ciphertext => {
    await expect(
      decryptMessage(ciphertext, 'legacy-secret'),
    ).rejects.toThrow();
  });

  it('rejects a bit-flipped authenticated v4 payload', async () => {
    const encrypted = await encryptMessage('authenticated', 'tamper-secret');
    const payload = CryptoJS.enc.Base64.parse(
      encrypted.slice(V4_PREFIX.length),
    );
    payload.words[5] ^= 0x01000000;
    await expect(
      decryptMessage(
        `${V4_PREFIX}${CryptoJS.enc.Base64.stringify(payload)}`,
        'tamper-secret',
      ),
    ).rejects.toThrow();
  });

  it('still decrypts authenticated v3 ciphertext', async () => {
    // Manually seal with the historical v3 per-message PBKDF2 path.
    const secret = 'v3-compat-secret';
    const salt = CryptoJS.lib.WordArray.random(16);
    const iv = CryptoJS.lib.WordArray.random(16);
    const derived = CryptoJS.PBKDF2(secret, salt, {
      keySize: (32 + 32) / 4,
      iterations: 100_000,
      hasher: CryptoJS.algo.SHA256,
    });
    const encKey = CryptoJS.enc.Hex.parse(
      derived.toString(CryptoJS.enc.Hex).slice(0, 64),
    );
    const macKey = CryptoJS.enc.Hex.parse(
      derived.toString(CryptoJS.enc.Hex).slice(64, 128),
    );
    const encrypted = CryptoJS.AES.encrypt('legacy-v3-message', encKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const mac = CryptoJS.HmacSHA256(
      salt.clone().concat(iv).concat(encrypted.ciphertext),
      macKey,
    );
    const payload = salt
      .clone()
      .concat(iv)
      .concat(encrypted.ciphertext)
      .concat(mac);
    const ciphertext = `${V3_PREFIX}${CryptoJS.enc.Base64.stringify(payload)}`;
    await expect(decryptMessage(ciphertext, secret)).resolves.toBe(
      'legacy-v3-message',
    );
  });
});

describe('cross-platform encryption compatibility', () => {
  it('decrypts a Node.js crypto reference vector', async () => {
    // Independently generated with node:crypto using PBKDF2-SHA256,
    // AES-256-CBC and HMAC-SHA256 with a fixed IV (v2 format).
    const fixture =
      'v2:ABEiM0RVZneImaq7zN3u/xCeYOMakx60KAqqPp7oa71J3RtmgjbF6VFsw3euB2t4LGY+M5JxrJ6runb5PTNs8XVr+bY8NmzzvlHzTLQUBw0=';
    expect(fixture.startsWith(V2_PREFIX)).toBe(true);
    await expect(decryptMessage(fixture, 'cross-platform-🔐')).resolves.toBe(
      'Hello, 世界 🌍\nLine 2',
    );
  });
});
