import React from 'react';
import {Platform, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

import {getEmojiIconAsset} from './emojiIconAssets';
import {useTheme} from './theme';

/**
 * iOS Simulator often fails to render emoji in Text (shows boxed ?).
 * Matching SVGs in assets/icons/ are used automatically in that case.
 * On device and Android, emoji are always used.
 */
function shouldUseEmojiFallback(): boolean {
  return __DEV__ && Platform.OS === 'ios';
}

interface EmojiIconProps {
  emoji: string;
  size?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  fallback?: React.ReactNode;
}

export function EmojiIcon({
  emoji,
  size = 28,
  style,
  containerStyle,
  fallback,
}: EmojiIconProps) {
  const {colors} = useTheme();
  const AssetIcon = getEmojiIconAsset(emoji);
  const autoFallback = AssetIcon ? (
    <AssetIcon width={size} height={size} color={colors.label} />
  ) : null;
  const resolvedFallback = fallback ?? autoFallback;

  if (resolvedFallback && shouldUseEmojiFallback()) {
    return (
      <View
        style={[styles.fallbackSlot, {width: size, height: size}, containerStyle]}
        accessibilityElementsHidden>
        {resolvedFallback}
      </View>
    );
  }

  return (
    <Text
      style={[styles.emoji, {fontSize: size}, style]}
      accessibilityElementsHidden>
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
  fallbackSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
