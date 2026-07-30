import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {copySensitiveText} from '../../services/clipboard';
import {triggerLightHaptic} from '../../services/haptics';
import {shareText} from '../../services/share';
import {BODY_MAX_FONT_MULTIPLIER, CHROME_MAX_FONT_MULTIPLIER} from './accessibility';
import {MIN_TOUCH_TARGET, useTheme} from './theme';
import {useToast} from './Toast';

interface CopyFieldProps {
  label: string;
  value: string;
  monospace?: boolean;
  concealed?: boolean;
  accessibilityLabel?: string;
  showShare?: boolean;
}

function concealValue(value: string): string {
  if (value.length <= 12) {
    return '••••••••';
  }
  return `${value.slice(0, 8)}···${value.slice(-4)}`;
}

export function CopyField({
  label,
  value,
  monospace = true,
  concealed = false,
  accessibilityLabel,
  showShare = true,
}: CopyFieldProps) {
  const {colors} = useTheme();
  const {showToast} = useToast();
  const {t} = useTranslation();
  const [justCopied, setJustCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (!value) {
      return;
    }
    void copySensitiveText(value);
    triggerLightHaptic();
    showToast(t('common.copied'));
    // Inline label change works inside pageSheet modals where a toast Modal cannot.
    setJustCopied(true);
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = setTimeout(() => setJustCopied(false), 1800);
  }, [showToast, t, value]);

  const handleShare = useCallback(async () => {
    if (!value) {
      return;
    }
    const shared = await shareText(value, label);
    if (shared) {
      triggerLightHaptic();
    }
  }, [label, value]);

  const displayValue = concealed ? concealValue(value) : value;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.label, {color: colors.secondaryLabel}]}
        maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}
        accessibilityElementsHidden>
        {label}
      </Text>
      <View
        style={[
          styles.fieldCard,
          {backgroundColor: colors.secondaryGroupedBackground},
        ]}>
        <Text
          style={[
            styles.value,
            {color: colors.label},
            monospace && styles.monospace,
            concealed && styles.concealed,
          ]}
          selectable={!concealed}
          maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}
          accessibilityLabel={
            concealed
              ? t('a11y.concealedField', {label: label.toLowerCase()})
              : undefined
          }>
          {displayValue}
        </Text>
        <View
          style={[styles.actionsRow, {borderTopColor: colors.separator}]}>
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={
              accessibilityLabel ??
              t('a11y.copyField', {label: label.toLowerCase()})
            }
            style={({pressed}) => [
              styles.actionButton,
              {opacity: pressed ? 0.6 : 1},
            ]}>
            <Text
              style={[styles.actionText, {color: colors.securityTint}]}
              maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
              {justCopied ? t('common.copied') : t('common.copy')}
            </Text>
          </Pressable>
          {showShare && (
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.shareField', {
                label: label.toLowerCase(),
              })}
              style={({pressed}) => [
                styles.actionButton,
                {opacity: pressed ? 0.6 : 1},
              ]}>
              <Text
                style={[styles.actionText, {color: colors.securityTint}]}
                maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}>
                {t('common.share')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  fieldCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  value: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monospace: {
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  concealed: {
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  actionButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
