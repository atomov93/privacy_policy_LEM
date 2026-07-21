import { decodeKeyQrPayload } from '../src/services/qrPayload';

describe('oversized and malicious QR payloads', () => {
  it.each([
    ['array', JSON.stringify([{ v: 1, name: 'x', secret: 'y' }])],
    ['number', '1'],
    ['null', 'null'],
    [
      'nested values',
      JSON.stringify({ v: 1, name: { value: 'x' }, secret: ['y'] }),
    ],
    ['unsupported version', JSON.stringify({ v: 999, name: 'x', secret: 'y' })],
  ])('rejects %s', (_label, raw) => {
    expect(decodeKeyQrPayload(raw)).toBeNull();
  });

  it('trims accepted names and secrets', () => {
    expect(
      decodeKeyQrPayload(
        JSON.stringify({
          v: 1,
          name: ' Alice ',
          secret: ' secret ',
        }),
      ),
    ).toEqual({ name: 'Alice', secret: 'secret' });
  });

  it.failing(
    'rejects payloads larger than the supported QR transport limit',
    () => {
      const raw = JSON.stringify({
        v: 1,
        name: 'Alice',
        secret: 'x'.repeat(100_000),
      });
      expect(decodeKeyQrPayload(raw)).toBeNull();
    },
  );

  it.failing('rejects control characters in key names', () => {
    const raw = JSON.stringify({
      v: 1,
      name: 'Alice\u0000\nAdmin',
      secret: 'secret',
    });
    expect(decodeKeyQrPayload(raw)).toBeNull();
  });
});
