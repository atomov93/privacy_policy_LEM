import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';

interface QrIconProps {
  size?: number;
  color: string;
  style?: ViewStyle;
}

export function QrIcon({size = 22, color, style}: QrIconProps) {
  const unit = size / 5;
  const dot = (filled: boolean, key: string) => (
    <View
      key={key}
      style={[
        styles.dot,
        {
          width: unit,
          height: unit,
          backgroundColor: filled ? color : 'transparent',
          borderWidth: filled ? 0 : StyleSheet.hairlineWidth,
          borderColor: color,
        },
      ]}
    />
  );

  const pattern = [
    [1, 1, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [1, 1, 1, 0, 1],
    [0, 1, 0, 1, 1],
    [1, 0, 1, 1, 1],
  ];

  return (
    <View
      style={[styles.container, {width: size, height: size}, style]}
      accessibilityElementsHidden>
      {pattern.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((filled, colIndex) =>
            dot(filled === 1, `${rowIndex}-${colIndex}`),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  dot: {
    borderRadius: 1,
  },
});
