import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';

import {copySensitiveText} from '../../services/clipboard';
import {triggerLightHaptic} from '../../services/haptics';
import {shareText} from '../../services/share';
import {BODY_MAX_FONT_MULTIPLIER, CHROME_MAX_FONT_MULTIPLIER} from './accessibility';
import {MIN_TOUCH_TARGET, useTheme} from './theme';
import {useToast} from './Toast';

interface InputFieldProps extends TextInputProps {
  label?: string;
  showPaste?: boolean;
  showCopy?: boolean;
  showShare?: boolean;
  showToggleSecret?: boolean;
  monospace?: boolean;
  containerStyle?: object;
}

export function InputField({
  label,
  showPaste = false,
  showCopy = false,
  showShare = false,
  showToggleSecret = false,
  monospace = false,
  containerStyle,
  style,
  secureTextEntry,
  placeholderTextColor,
  value,
  ...rest
}: InputFieldProps) {
  const {colors} = useTheme();
  const {showToast} = useToast();
  const {t} = useTranslation();
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<'copied' | 'pasted' | null>(
    null,
  );
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const flashAction = useCallback((kind: 'copied' | 'pasted') => {
    setActionFeedback(kind);
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = setTimeout(() => setActionFeedback(null), 1800);
  }, []);

  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getString();
    if (!text || !rest.onChangeText) {
      return;
    }
    rest.onChangeText(text);
    triggerLightHaptic();
    showToast(t('common.pasted'));
    flashAction('pasted');
  }, [flashAction, rest, showToast, t]);

  const handleCopy = useCallback(() => {
    const text = typeof value === 'string' ? value : '';
    if (!text) {
      return;
    }
    void copySensitiveText(text);
    triggerLightHaptic();
    showToast(t('common.copied'));
    flashAction('copied');
  }, [flashAction, showToast, t, value]);

  const handleShare = useCallback(async () => {
    const text = typeof value === 'string' ? value : '';
    if (!text) {
      return;
    }
    const shared = await shareText(text, label);
    if (shared) {
      triggerLightHaptic();
    }
  }, [label, value]);

  const isSecure = secureTextEntry && !isSecretVisible;
  const hasActions =
    showPaste || showCopy || showShare || showToggleSecret;
  const fieldName = label ?? t('common.field');

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          style={[styles.label, {color: colors.secondaryLabel}]}
          maxFontSizeMultiplier={CHROME_MAX_FONT_MULTIPLIER}
          accessibilityElementsHidden>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.fieldCard,
          {backgroundColor: colors.groupedBackground},
        ]}>
        <TextInput
          {...rest}
          value={value}
          secureTextEntry={isSecure}
          placeholderTextColor={placeholderTextColor ?? colors.tertiaryLabel}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          maxFontSizeMultiplier={BODY_MAX_FONT_MULTIPLIER}
          style={[
            styles.input,
            monospace && styles.monospace,
            {color: colors.label},
            style,
          ]}
        />
        {hasActions && (
          <View
            style={[
              styles.actionsRow,
              {borderTopColor: colors.separator},
            ]}>
            {showPaste && (
              <Pressable
                onPress={handlePaste}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.pasteInto', {field: fieldName})}
                style={({pressed}) => [
                  styles.actionButton,
                  {opacity: pressed ? 0.6 : 1},
                ]}>
                <Text style={[styles.actionText, {color: colors.securityTint}]}>
                  {actionFeedback === 'pasted'
                    ? t('common.pasted')
                    : t('common.paste')}
                </Text>
              </Pressable>
            )}
            {showCopy && (
              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.copyField', {label: fieldName})}
                style={({pressed}) => [
                  styles.actionButton,
                  {opacity: pressed ? 0.6 : 1},
                ]}>
                <Text style={[styles.actionText, {color: colors.securityTint}]}>
                  {actionFeedback === 'copied'
                    ? t('common.copied')
                    : t('common.copy')}
                </Text>
              </Pressable>
            )}
            {showShare && (
              <Pressable
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.shareField', {label: fieldName})}
                style={({pressed}) => [
                  styles.actionButton,
                  {opacity: pressed ? 0.6 : 1},
                ]}>
                <Text style={[styles.actionText, {color: colors.securityTint}]}>
                  {t('common.share')}
                </Text>
              </Pressable>
            )}
            {showToggleSecret && (
              <Pressable
                onPress={() => setIsSecretVisible(v => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  isSecretVisible ? t('a11y.hideSecret') : t('a11y.showSecret')
                }
                style={({pressed}) => [
                  styles.actionButton,
                  {opacity: pressed ? 0.6 : 1},
                ]}>
                <Text style={[styles.actionText, {color: colors.securityTint}]}>
                  {isSecretVisible ? t('common.hide') : t('common.show')}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  fieldCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  monospace: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
