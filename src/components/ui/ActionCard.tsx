import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {EmojiIcon} from './EmojiIcon';
import {MIN_TOUCH_TARGET, useTheme} from './theme';

interface ActionCardProps {
  icon?: string;
  iconFallback?: React.ReactNode;
  iconNode?: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
  selected?: boolean;
}

export function ActionCard({
  icon,
  iconFallback,
  iconNode,
  title,
  subtitle,
  selected,
  onPress,
  accessibilityLabel,
}: ActionCardProps) {
  const {colors} = useTheme();
  const isSelectable = selected !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={isSelectable ? {selected} : undefined}
      style={({pressed}) => [
        styles.card,
        {
          backgroundColor:
            isSelectable && selected
              ? colors.securityBackground
              : colors.groupedBackground,
          borderColor:
            isSelectable && selected ? colors.securityTint : colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.iconSlot}>
        {iconNode ??
          (icon ? (
            <EmojiIcon
              emoji={icon}
              size={28}
              fallback={iconFallback}
            />
          ) : null)}
      </View>
      <Text
        style={[
          styles.title,
          {
            color:
              isSelectable && selected ? colors.securityTint : colors.label,
          },
        ]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

interface ActionCardRowProps {
  children: React.ReactNode;
}

export function ActionCardRow({children}: ActionCardRowProps) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET * 2,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconSlot: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
