import {Platform, StatusBar, useColorScheme, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

function getSheetTopInset(top: number): number {
  if (top > 0) {
    return top;
  }
  if (Platform.OS === 'android') {
    return StatusBar.currentHeight ?? 24;
  }
  return 12;
}

export const MIN_TOUCH_TARGET = 44;
export const CONTENT_MAX_WIDTH = 560;
export const WIDE_BREAKPOINT = 600;

export const lightColors = {
  background: '#F2F2F7',
  groupedBackground: '#FFFFFF',
  secondaryGroupedBackground: '#F2F2F7',
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: 'rgba(60, 60, 67, 0.6)',
  tint: '#007AFF',
  securityTint: '#0040A8',
  separator: '#C6C6C8',
  destructive: '#FF3B30',
  fill: 'rgba(120, 120, 128, 0.2)',
  cardBorder: '#D1D1D6',
  securityBackground: 'rgba(0, 64, 168, 0.08)',
  secretBackground: 'rgba(255, 149, 0, 0.08)',
  successBackground: 'rgba(52, 199, 89, 0.12)',
  outputBackground: 'rgba(0, 122, 255, 0.08)',
};

export const darkColors = {
  background: '#000000',
  groupedBackground: '#1C1C1E',
  secondaryGroupedBackground: '#2C2C2E',
  label: '#FFFFFF',
  secondaryLabel: '#EBEBF5',
  tertiaryLabel: 'rgba(235, 235, 245, 0.6)',
  tint: '#0A84FF',
  securityTint: '#409CFF',
  separator: '#38383A',
  destructive: '#FF453A',
  fill: 'rgba(120, 120, 128, 0.36)',
  cardBorder: '#48484A',
  securityBackground: 'rgba(64, 156, 255, 0.15)',
  secretBackground: 'rgba(255, 159, 10, 0.12)',
  successBackground: 'rgba(48, 209, 88, 0.15)',
  outputBackground: 'rgba(10, 132, 255, 0.15)',
};

export type ThemeColors = typeof lightColors;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
}

export function useContentLayout() {
  const {width} = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return {
    isWide,
    contentStyle: isWide
      ? ({
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: 'center' as const,
          width: '100%' as const,
        })
      : undefined,
  };
}

export function useSheetInsets() {
  const insets = useSafeAreaInsets();

  return {
    headerStyle: {
      paddingTop: getSheetTopInset(insets.top) + 4,
      paddingLeft: Math.max(insets.left, 16),
      paddingRight: Math.max(insets.right, 16),
    },
    contentPadding: {
      paddingLeft: Math.max(insets.left, 16),
      paddingRight: Math.max(insets.right, 16),
      paddingBottom: insets.bottom + 24,
    },
  };
}
