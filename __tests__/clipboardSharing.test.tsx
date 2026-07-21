import Clipboard from '@react-native-clipboard/clipboard';
import {Share} from 'react-native';

import {
  cancelClipboardClear,
  copySensitiveText,
} from '../src/services/clipboard';
import {shareText} from '../src/services/share';

const clipboard = Clipboard as jest.Mocked<typeof Clipboard>;

describe('clipboard behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cancelClipboardClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    cancelClipboardClear();
    jest.useRealTimers();
  });

  it('copies sensitive text to the clipboard', async () => {
    await copySensitiveText('🔐 secret');
    expect(clipboard.setString).toHaveBeenCalledWith('🔐 secret');
  });

  it('does not touch the clipboard for empty text', async () => {
    await copySensitiveText('');
    expect(clipboard.setString).not.toHaveBeenCalled();
  });

  it('clears sensitive clipboard contents after the TTL', () => {
    void copySensitiveText('top-secret', 1000);
    expect(clipboard.setString).toHaveBeenCalledWith('top-secret');
    jest.advanceTimersByTime(1000);
    expect(clipboard.setString).toHaveBeenLastCalledWith('');
  });

  it('does not clear the clipboard if a newer copy replaced it', () => {
    void copySensitiveText('first', 1000);
    void copySensitiveText('second', 1000);
    jest.advanceTimersByTime(1000);
    expect(clipboard.setString).toHaveBeenLastCalledWith('');
    // Only the latest value should be cleared once
    const clears = clipboard.setString.mock.calls.filter(call => call[0] === '');
    expect(clears).toHaveLength(1);
  });
});

describe('native sharing behavior', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not open the share sheet for empty text', async () => {
    const share = jest.spyOn(Share, 'share');
    await expect(shareText('')).resolves.toBe(false);
    expect(share).not.toHaveBeenCalled();
  });

  it('returns true only when native sharing completes', async () => {
    jest.spyOn(Share, 'share').mockResolvedValueOnce({
      action: Share.sharedAction,
      activityType: 'test',
    });
    await expect(shareText('ciphertext', 'Encrypted message')).resolves.toBe(
      true,
    );
    expect(Share.share).toHaveBeenCalledWith({
      message: 'ciphertext',
      title: 'Encrypted message',
    });
  });

  it('returns false when native sharing throws', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('unavailable'));
    await expect(shareText('ciphertext')).resolves.toBe(false);
  });
});
