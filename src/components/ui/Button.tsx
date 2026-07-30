import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import {BODY_MAX_FONT_MULTIPLIER, useReducedMotion} from './accessibility';
import {useTheme} from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  flex?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  flex,
}: ButtonProps) {
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? colors.securityTint
      : variant === 'destructive'
        ? colors.destructive
        : colors.fill;

  const textColor =
    variant === 'secondary' ? colors.securityTint : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{disabled: isDisabled, busy: loading}}
      style={({pressed}) => [
        styles.button,
        flex && styles.flex,
        {
          backgroundColor,
          opacity: isDisabled
            ? 0.4
            : pressed && !reduceMotion
              ? 0.75
              : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={textColor}
          accessibilityLabel={title}
        />
      ) : (
        <Text
          style={[styles.text, {color: textColor}]}
          maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  flex: {
    flex: 1,
    alignSelf: 'stretch',
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
