import {
  decodeKeyQrPayload,
  encodeKeyQrPayload,
  isEncryptedQrPayload,
  keyFromQrPayload,
} from '../src/services/qrPayload';
import {MAX_KEY_NAME_LENGTH, MAX_SECRET_LENGTH} from '../src/services/limits';

describe('oversized and malicious QR payloads', () => {
  it.each([
    ['array', JSON.stringify([{v: 1, name: 'x', secret: 'y'}])],
    ['number', '1'],
    ['null', 'null'],
    [
      'nested values',
      JSON.stringify({v: 1, name: {value: 'x'}, secret: ['y']}),
    ],
    ['unsupported version', JSON.stringify({v: 999, name: 'x', secret: 'y'})],
    [
      'plaintext v1',
      JSON.stringify({v: 1, name: 'Alice', secret: 'secret'}),
    ],
  ])('rejects %s', (_label, raw) => {
    expect(decodeKeyQrPayload(raw, '123456')).toBeNull();
  });

  it('trims accepted names and secrets', () => {
    const encoded = encodeKeyQrPayload({
      name: ' Alice ',
      secret: ' secret ',
    });
    expect(decodeKeyQrPayload(encoded.payload, encoded.pin)).toEqual({
      name: 'Alice',
      secret: 'secret',
    });
  });

  it('rejects payloads larger than the supported QR transport limit', () => {
    const raw = JSON.stringify({
      v: 2,
      salt: 'aa',
      exp: Date.now() + 60_000,
      data: 'x'.repeat(100_000),
    });
    expect(decodeKeyQrPayload(raw, '123456')).toBeNull();
    expect(isEncryptedQrPayload(raw)).toBe(false);
  });

  it('rejects control characters in key names', () => {
    expect(() =>
      encodeKeyQrPayload({
        name: 'Alice\u0000\nAdmin',
        secret: 'secret',
      }),
    ).toThrow();
  });

  it('rejects encoding when name or secret exceeds limits', () => {
    expect(() =>
      encodeKeyQrPayload({
        name: 'A'.repeat(MAX_KEY_NAME_LENGTH + 1),
        secret: 'secret',
      }),
    ).toThrow(/Invalid key/);
    expect(() =>
      encodeKeyQrPayload({
        name: 'Alice',
        secret: 's'.repeat(MAX_SECRET_LENGTH + 1),
      }),
    ).toThrow(/Invalid key/);
  });

  it('throws when the sealed QR payload exceeds the transport limit', () => {
    jest.resetModules();
    jest.doMock('../src/services/limits', () => ({
      ...jest.requireActual('../src/services/limits'),
      MAX_QR_PAYLOAD_LENGTH: 40,
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {encodeKeyQrPayload: encodeTiny} = require('../src/services/qrPayload');
    expect(() =>
      encodeTiny({name: 'Alice', secret: 'test-secret'}),
    ).toThrow(/QR payload exceeds size limit/);
    jest.dontMock('../src/services/limits');
    jest.resetModules();
  });

  it('builds a SavedKey from a decoded QR payload', () => {
    const key = keyFromQrPayload({name: ' Alice ', secret: ' secret '});
    expect(key.name).toBe('Alice');
    expect(key.secret).toBe('secret');
    expect(key.fingerprint).toHaveLength(64);
    expect(key.id).toMatch(/^\d+-[0-9a-f]{8}$/);
    expect(typeof key.createdAt).toBe('number');
  });
});
