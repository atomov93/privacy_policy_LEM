import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  isErrorWithCode,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';

import {
  isLikelyLmeUri,
  pickAndReadLmeFile,
  readUriAsUtf8,
  shareLmeFile,
  writeLmeTempFile,
} from '../src/services/lmeFileIO';
import {LME_MIME_TYPE} from '../src/services/limits';

const writeFile = RNFS.writeFile as jest.Mock;
const readFile = RNFS.readFile as jest.Mock;
const shareOpen = Share.open as jest.Mock;
const pickMock = pick as jest.Mock;
const keepLocalCopyMock = keepLocalCopy as jest.Mock;
const isErrorWithCodeMock = isErrorWithCode as jest.Mock;

describe('lmeFileIO', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    writeFile.mockResolvedValue(undefined);
    readFile.mockResolvedValue('LME1\n{}');
    shareOpen.mockResolvedValue({success: true});
    pickMock.mockResolvedValue([]);
    keepLocalCopyMock.mockResolvedValue([]);
    isErrorWithCodeMock.mockReturnValue(false);
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it('writes .lme contents under the caches directory', async () => {
    const path = await writeLmeTempFile('LME1\n{}', 'Alice Key.lme');
    expect(path).toBe('/tmp/Alice_Key.lme');
    expect(writeFile).toHaveBeenCalledWith(path, 'LME1\n{}', 'utf8');
  });

  it('appends the .lme extension when missing', async () => {
    const path = await writeLmeTempFile('LME1\n{}', 'Bob');
    expect(path).toBe('/tmp/Bob.lme');
  });

  it('shares a local file through the system sheet', async () => {
    await expect(shareLmeFile('/tmp/key.lme', 'key.lme')).resolves.toBe(true);
    expect(shareOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'file:///tmp/key.lme',
        type: LME_MIME_TYPE,
        filename: 'key.lme',
        failOnCancel: false,
      }),
    );
  });

  it('returns false when sharing fails', async () => {
    shareOpen.mockRejectedValueOnce(new Error('cancelled'));
    await expect(shareLmeFile('/tmp/key.lme', 'key.lme')).resolves.toBe(false);
  });

  it('reads file:// URIs by stripping the scheme', async () => {
    readFile.mockResolvedValueOnce('contents');
    await expect(readUriAsUtf8('file:///tmp/key.lme')).resolves.toBe('contents');
    expect(readFile).toHaveBeenCalledWith('/tmp/key.lme', 'utf8');
  });

  it('reads Android content:// URIs without stripping the scheme', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    readFile.mockResolvedValueOnce('android-contents');
    await expect(
      readUriAsUtf8('content://provider/docs/key.lme'),
    ).resolves.toBe('android-contents');
    expect(readFile).toHaveBeenCalledWith(
      'content://provider/docs/key.lme',
      'utf8',
    );
  });

  it('returns null when the document picker is cancelled', async () => {
    const cancelError = {code: 'DOCUMENT_PICKER_CANCELED'};
    pickMock.mockRejectedValueOnce(cancelError);
    isErrorWithCodeMock.mockReturnValueOnce(true);
    await expect(pickAndReadLmeFile()).resolves.toBeNull();
  });

  it('returns null when the picker yields no file', async () => {
    pickMock.mockResolvedValueOnce([]);
    await expect(pickAndReadLmeFile()).resolves.toBeNull();
  });

  it('copies picked files locally on iOS before reading', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    pickMock.mockResolvedValueOnce([
      {uri: 'file:///inbox/key.lme', name: 'key.lme'},
    ]);
    keepLocalCopyMock.mockResolvedValueOnce([
      {status: 'success', localUri: 'file:///tmp/local.lme'},
    ]);
    readFile.mockResolvedValueOnce('imported');
    await expect(pickAndReadLmeFile()).resolves.toBe('imported');
    expect(keepLocalCopyMock).toHaveBeenCalled();
    expect(readFile).toHaveBeenCalledWith('/tmp/local.lme', 'utf8');
  });

  it('reads the picked URI directly when local copy is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    pickMock.mockResolvedValueOnce([
      {uri: 'file:///sdcard/key.lme', name: 'key.lme'},
    ]);
    readFile.mockResolvedValueOnce('direct');
    await expect(pickAndReadLmeFile()).resolves.toBe('direct');
    expect(readFile).toHaveBeenCalledWith('/sdcard/key.lme', 'utf8');
  });

  it('copies Android content:// picks locally before reading', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    pickMock.mockResolvedValueOnce([
      {uri: 'content://provider/docs/key.lme', name: 'notes.txt'},
    ]);
    keepLocalCopyMock.mockResolvedValueOnce([
      {status: 'success', localUri: 'file:///tmp/from-content.lme'},
    ]);
    readFile.mockResolvedValueOnce('from-content');
    await expect(pickAndReadLmeFile()).resolves.toBe('from-content');
    expect(keepLocalCopyMock).toHaveBeenCalled();
    expect(readFile).toHaveBeenCalledWith('/tmp/from-content.lme', 'utf8');
  });

  it('falls back to the original URI when local copy fails', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    pickMock.mockResolvedValueOnce([
      {uri: 'file:///inbox/key.lme', name: 'key.lme'},
    ]);
    keepLocalCopyMock.mockResolvedValueOnce([{status: 'error'}]);
    readFile.mockResolvedValueOnce('fallback');
    await expect(pickAndReadLmeFile()).resolves.toBe('fallback');
    expect(readFile).toHaveBeenCalledWith('/inbox/key.lme', 'utf8');
  });

  it('rethrows unexpected picker errors', async () => {
    pickMock.mockRejectedValueOnce(new Error('disk full'));
    isErrorWithCodeMock.mockReturnValue(false);
    await expect(pickAndReadLmeFile()).rejects.toThrow('disk full');
  });

  it('detects likely .lme URIs', () => {
    expect(isLikelyLmeUri(null)).toBe(false);
    expect(isLikelyLmeUri(undefined)).toBe(false);
    expect(isLikelyLmeUri('file:///tmp/key.lme')).toBe(true);
    expect(isLikelyLmeUri('content://docs/1')).toBe(true);
    expect(isLikelyLmeUri('https://example.com/letsmessageencrypt/x')).toBe(
      true,
    );
    expect(isLikelyLmeUri('https://example.com/note.txt')).toBe(false);
  });
});
