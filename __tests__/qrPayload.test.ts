import {
  decodeKeyQrPayload,
  encodeKeyQrPayload,
  keyFromQrPayload,
} from '../src/services/qrPayload';

describe('qrPayload', () => {
  it('round-trips key name and secret with a transfer PIN', () => {
    const encoded = encodeKeyQrPayload({name: 'Alice', secret: 'test-secret'});
    const decoded = decodeKeyQrPayload(encoded.payload, encoded.pin);
    expect(decoded).toEqual({name: 'Alice', secret: 'test-secret'});
    expect(JSON.parse(encoded.payload).v).toBe(2);
    expect(JSON.parse(encoded.payload).secret).toBeUndefined();
  });

  it('rejects invalid payloads', () => {
    expect(decodeKeyQrPayload('not-json', '123456')).toBeNull();
    expect(
      decodeKeyQrPayload('{"v":2,"name":"x","secret":"y"}', '123456'),
    ).toBeNull();
    expect(
      decodeKeyQrPayload(
        JSON.stringify({v: 1, name: 'x', secret: 'y'}),
        '123456',
      ),
    ).toBeNull();
  });

  it('rejects wrong PIN', () => {
    const encoded = encodeKeyQrPayload({name: 'Alice', secret: 'test-secret'});
    expect(decodeKeyQrPayload(encoded.payload, '000000')).toBeNull();
  });

  it('rejects expired QR payloads', () => {
    const encoded = encodeKeyQrPayload({name: 'Alice', secret: 'test-secret'});
    const parsed = JSON.parse(encoded.payload);
    parsed.exp = Date.now() - 1000;
    expect(decodeKeyQrPayload(JSON.stringify(parsed), encoded.pin)).toBeNull();
  });

  it('debounces rapid duplicate QR scans', () => {
    const {
      shouldProcessQrScan,
      resetQrScanDebounce,
    } = require('../src/services/qrPayload');
    resetQrScanDebounce();
    expect(shouldProcessQrScan('abc', 1000)).toBe(true);
    expect(shouldProcessQrScan('abc', 1100)).toBe(false);
    expect(shouldProcessQrScan('abc', 4000)).toBe(true);
  });

  it('detects encrypted QR payloads', () => {
    const {isEncryptedQrPayload, encodeKeyQrPayload} = require('../src/services/qrPayload');
    const encoded = encodeKeyQrPayload({name: 'A', secret: 'b'});
    expect(isEncryptedQrPayload(encoded.payload)).toBe(true);
    expect(isEncryptedQrPayload('not-json')).toBe(false);
  });
});
