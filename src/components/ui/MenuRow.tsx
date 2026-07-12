import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {EmojiIcon} from './EmojiIcon';
import {MIN_TOUCH_TARGET, useTheme} from './theme';

interface MenuRowProps {
  icon?: string;
  iconFallback?: React.ReactNode;
  iconNode?: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export function MenuRow({
  icon,
  iconFallback,
  iconNode,
  title,
  subtitle,
  onPress,
  destructive = false,
  showChevron = true,
  accessibilityLabel,
  accessibilityHint,
}: MenuRowProps) {
  const {colors} = useTheme();

  const titleColor = destructive ? colors.destructive : colors.label;
  const content = (
    <>
      <View style={styles.iconSlot}>
        {iconNode ??
          (icon ? (
            <EmojiIcon
              emoji={icon}
              size={22}
              fallback={iconFallback}
            />
          ) : null)}
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, {color: titleColor}]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && onPress && (
        <Text
          style={[styles.chevron, {color: colors.tertiaryLabel}]}
          accessibilityElementsHidden>
          ›
        </Text>
      )}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({pressed}) => [styles.row, {opacity: pressed ? 0.65 : 1}]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 8,
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 4,
  },
});
