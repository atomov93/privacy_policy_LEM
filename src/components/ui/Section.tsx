import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';

import {BODY_MAX_FONT_MULTIPLIER, CHROME_MAX_FONT_MULTIPLIER} from './accessibility';
import {useTheme} from './theme';

interface SectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  uppercaseTitle?: boolean;
}

export function Section({
  title,
  footer,
  children,
  style,
  uppercaseTitle = false,
}: SectionProps) {
  const {colors} = useTheme();

  return (
    <View style={[styles.wrapper, style]}>
      {title && (
        <Text
          style={[styles.header, {color: colors.secondaryLabel}]}
          accessibilityRole="header"
          maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
          {uppercaseTitle ? title.toUpperCase() : title}
        </Text>
      )}
      <View
        style={[
          styles.card,
          {backgroundColor: colors.groupedBackground},
        ]}>
        {children}
      </View>
      {footer && (
        <Text
          style={[styles.footer, {color: colors.tertiaryLabel}]}
          maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}>
          {footer}
        </Text>
      )}
    </View>
  );
}

interface SectionRowProps {
  children: React.ReactNode;
  isLast?: boolean;
}

export function SectionRow({children, isLast}: SectionRowProps) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.08,
    marginBottom: 8,
    marginLeft: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginHorizontal: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
