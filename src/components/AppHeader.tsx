import React from 'react';
import {Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {BODY_MAX_FONT_MULTIPLIER} from './ui/accessibility';
import {HelpIcon} from './ui/HelpIcon';
import {MIN_TOUCH_TARGET, useTheme} from './ui/theme';

const appLogo = require('../../assets/branding/app-logo.png');

export type AppTab = 'keys' | 'encrypt';

interface AppHeaderProps {
  activeTab: AppTab;
  keyCount: number;
  onHelpPress: () => void;
}

export function AppHeader({activeTab, keyCount, onHelpPress}: AppHeaderProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const hasKeys = keyCount > 0;

  const guidanceKey =
    activeTab === 'keys'
      ? hasKeys
        ? 'header.guidanceKeysReady'
        : 'header.guidanceKeysEmpty'
      : hasKeys
        ? 'header.guidanceEncryptReady'
        : 'header.guidanceEncryptEmpty';

  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <View style={styles.sideSlot} accessibilityElementsHidden />
        <Image
          source={appLogo}
          style={styles.logo}
          accessibilityRole="image"
          accessibilityLabel={t('app.title')}
          resizeMode="contain"
        />
        <View style={styles.sideSlot}>
          <Pressable
            onPress={onHelpPress}
            accessibilityRole="button"
            accessibilityLabel={t('header.helpA11y')}
            accessibilityHint={t('header.helpHint')}
            hitSlop={8}
            style={({pressed}) => [
              styles.helpButton,
              {opacity: pressed ? 0.7 : 1},
            ]}>
            <HelpIcon size={30} color={colors.securityTint} />
          </Pressable>
        </View>
      </View>
      <Text
        style={[styles.guidance, {color: colors.secondaryLabel}]}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}>
        {t(guidanceKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 12,
    paddingBottom: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    flex: 1,
    alignItems: 'flex-end',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  guidance: {
    fontSize: 15,
    marginTop: 10,
    lineHeight: 20,
    textAlign: 'center',
  },
  helpButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
