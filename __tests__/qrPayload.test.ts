import {
  decodeKeyQrPayload,
  encodeKeyQrPayload,
  keyFromQrPayload,
} from '../src/services/qrPayload';

describe('qrPayload', () => {
  it('round-trips key name and secret', () => {
    const encoded = encodeKeyQrPayload({name: 'Alice', secret: 'test-secret'});
    const decoded = decodeKeyQrPayload(encoded);
    expect(decoded).toEqual({name: 'Alice', secret: 'test-secret'});
  });

  it('rejects invalid payloads', () => {
    expect(decodeKeyQrPayload('not-json')).toBeNull();
    expect(decodeKeyQrPayload('{"v":2,"name":"x","secret":"y"}')).toBeNull();
    expect(decodeKeyQrPayload('{"v":1,"name":"","secret":"y"}')).toBeNull();
  });

  it('builds a saved key with fingerprint', () => {
    const key = keyFromQrPayload({name: 'Bob', secret: 'hello'});
    expect(key.name).toBe('Bob');
    expect(key.secret).toBe('hello');
    expect(key.fingerprint).toHaveLength(64);
  });
});
