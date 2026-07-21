import Clipboard from '@react-native-clipboard/clipboard';
import React from 'react';
import { Pressable, Share } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { InputField } from '../src/components/ui/InputField';
import { shareText } from '../src/services/share';

const clipboard = Clipboard as jest.Mocked<typeof Clipboard>;

describe('clipboard behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pastes clipboard text through onChangeText', async () => {
    clipboard.getString.mockResolvedValueOnce('pasted secret');
    const onChangeText = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <InputField label="Secret" showPaste onChangeText={onChangeText} />,
      );
    });
    const paste = renderer.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'Paste into Secret');
    expect(paste).toBeDefined();
    await ReactTestRenderer.act(async () => paste!.props.onPress());
    expect(onChangeText).toHaveBeenCalledWith('pasted secret');
  });

  it('copies the exact value rather than its concealed rendering', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <InputField
          label="Secret"
          value="🔐 secret"
          showCopy
          secureTextEntry
        />,
      );
    });
    const copy = renderer.root
      .findAllByType(Pressable)
      .find(node => node.props.accessibilityLabel === 'Copy Secret');
    ReactTestRenderer.act(() => copy!.props.onPress());
    expect(clipboard.setString).toHaveBeenCalledWith('🔐 secret');
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
