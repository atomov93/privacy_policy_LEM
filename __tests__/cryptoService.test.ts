import CryptoJS from 'crypto-js';

import {
  decryptMessage,
  encryptMessage,
  fingerprintMatches,
  getFingerprint,
  V2_PREFIX,
} from '../src/services/cryptoService';

function encryptLegacyMessage(plaintext: string, secret: string): string {
  const key = CryptoJS.MD5(secret);
  const iv = CryptoJS.MD5(`${secret}:iv`);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

describe('cryptoService', () => {
  const secret = 'my-shared-secret';

  it('produces a stable SHA-256 fingerprint', () => {
    expect(getFingerprint(secret)).toBe(getFingerprint(secret));
    expect(getFingerprint(secret)).toHaveLength(64);
  });

  it('accepts legacy MD5 fingerprints during import verification', () => {
    expect(
      fingerprintMatches('hello', '5d41402abc4b2a76b9719d911017c592'),
    ).toBe(true);
    expect(
      fingerprintMatches('hello', getFingerprint('hello')),
    ).toBe(true);
    expect(
      fingerprintMatches('hello', '5d41402abc4b2a76b9719d911017c5921'),
    ).toBe(false);
  });

  it('encrypts and decrypts v2 messages symmetrically', async () => {
    const message = 'Hello from device A!';
    const encrypted = await encryptMessage(message, secret);
    expect(encrypted.startsWith(V2_PREFIX)).toBe(true);
    expect(encrypted).not.toBe(message);
    expect(await decryptMessage(encrypted, secret)).toBe(message);
  });

  it('still decrypts legacy v1 ciphertext', async () => {
    const message = 'Legacy message';
    const legacyCiphertext = encryptLegacyMessage(message, secret);
    expect(await decryptMessage(legacyCiphertext, secret)).toBe(message);
  });

  it('fails decryption with the wrong secret', async () => {
    const encrypted = await encryptMessage('test', secret);
    await expect(decryptMessage(encrypted, 'wrong-secret')).rejects.toThrow();
  });
});
