import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {BODY_MAX_FONT_MULTIPLIER} from './accessibility';
import {EmojiIcon} from './EmojiIcon';
import {useTheme} from './theme';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  iconFallback?: React.ReactNode;
}

export function EmptyState({
  title,
  message,
  icon = '🔑',
  iconFallback,
}: EmptyStateProps) {
  const {colors} = useTheme();

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="polite">
      <EmojiIcon
        emoji={icon}
        size={48}
        style={styles.icon}
        fallback={iconFallback}
      />
      <Text
        style={[styles.title, {color: colors.label}]}
        accessibilityRole="header"
        maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}
        importantForAccessibility="no">
        {title}
      </Text>
      <Text
        style={[styles.message, {color: colors.secondaryLabel}]}
        maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}
        importantForAccessibility="no">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
