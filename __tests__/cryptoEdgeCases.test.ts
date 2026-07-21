import CryptoJS from 'crypto-js';

import {
  decryptMessage,
  encryptMessage,
  V2_PREFIX,
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

  it.failing('round-trips an empty message', async () => {
    const encrypted = await encryptMessage('', 'empty-message-secret');
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
  it('decrypts valid legacy ciphertext surrounded by whitespace', async () => {
    const ciphertext = encryptLegacy('legacy text', 'legacy-secret');
    await expect(
      decryptMessage(`\n ${ciphertext} \t`, 'legacy-secret'),
    ).resolves.toBe('legacy text');
  });

  it.each(['', 'not-base64!!!', 'AA==', 'v2:', 'v2:not-base64!!!'])(
    'rejects malformed ciphertext %j',
    async ciphertext => {
      await expect(
        decryptMessage(ciphertext, 'legacy-secret'),
      ).rejects.toThrow();
    },
  );

  it('rejects a bit-flipped authenticated v2 payload', async () => {
    const encrypted = await encryptMessage('authenticated', 'tamper-secret');
    const payload = CryptoJS.enc.Base64.parse(
      encrypted.slice(V2_PREFIX.length),
    );
    payload.words[5] ^= 0x01000000;
    await expect(
      decryptMessage(
        `${V2_PREFIX}${CryptoJS.enc.Base64.stringify(payload)}`,
        'tamper-secret',
      ),
    ).rejects.toThrow();
  });
});

describe('cross-platform encryption compatibility', () => {
  it('decrypts a Node.js crypto reference vector', async () => {
    // Independently generated with node:crypto using PBKDF2-SHA256,
    // AES-256-CBC and HMAC-SHA256 with a fixed IV.
    const fixture =
      'v2:ABEiM0RVZneImaq7zN3u/xCeYOMakx60KAqqPp7oa71J3RtmgjbF6VFsw3euB2t4LGY+M5JxrJ6runb5PTNs8XVr+bY8NmzzvlHzTLQUBw0=';
    await expect(decryptMessage(fixture, 'cross-platform-🔐')).resolves.toBe(
      'Hello, 世界 🌍\nLine 2',
    );
  });
});
