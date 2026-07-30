import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  BODY_MAX_FONT_MULTIPLIER,
  CHROME_MAX_FONT_MULTIPLIER,
} from './accessibility';
import {MIN_TOUCH_TARGET, useSheetInsets, useTheme} from './theme';

interface SheetHeaderProps {
  title: string;
  actionLabel: string;
  onAction: () => void;
  actionAccessibilityLabel: string;
}

export function SheetHeader({
  title,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
}: SheetHeaderProps) {
  const {colors} = useTheme();
  const {headerStyle} = useSheetInsets();

  return (
    <View style={[styles.container, headerStyle]}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel}
          hitSlop={8}
          style={({pressed}) => [
            styles.actionButton,
            {opacity: pressed ? 0.6 : 1},
          ]}>
          <Text
            style={[styles.actionText, {color: colors.securityTint}]}
            maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
      <Text
        style={[styles.title, {color: colors.label}]}
        accessibilityRole="header"
        numberOfLines={2}
        maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  toolbar: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  actionButton: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingRight: 12,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
    lineHeight: 34,
    marginTop: 2,
  },
});
