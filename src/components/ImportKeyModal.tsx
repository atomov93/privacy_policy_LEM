import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {
  fingerprintMatches,
  generateSecureId,
  getFingerprint,
} from '../services/cryptoService';
import {triggerLightHaptic} from '../services/haptics';
import {addKey} from '../services/keyStorage';
import {SavedKey} from '../types';
import {Button, InputField, useTheme} from './ui';

interface ImportKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onKeyImported: (keys: SavedKey[]) => void;
  onScanQr: () => void;
}

function normalizeFingerprint(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, '');
}

export function ImportKeyModal({
  visible,
  onClose,
  onKeyImported,
  onScanQr,
}: ImportKeyModalProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [expectedFingerprint, setExpectedFingerprint] = useState('');

  const fingerprintStatus = useMemo(() => {
    const trimmedSecret = secret.trim();
    const normalizedExpected = normalizeFingerprint(expectedFingerprint);
    if (!normalizedExpected || !trimmedSecret) {
      return null;
    }
    return fingerprintMatches(trimmedSecret, normalizedExpected)
      ? 'match'
      : 'mismatch';
  }, [expectedFingerprint, secret]);

  const resetForm = useCallback(() => {
    setName('');
    setSecret('');
    setExpectedFingerprint('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleScanQr = useCallback(() => {
    resetForm();
    onClose();
    onScanQr();
  }, [onClose, onScanQr, resetForm]);

  const handleImport = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedSecret = secret.trim();
    const normalizedExpected = normalizeFingerprint(expectedFingerprint);

    if (!trimmedName) {
      Alert.alert(
        t('keys.alertMissingName'),
        t('importKey.alertMissingNameMessage'),
      );
      return;
    }
    if (!trimmedSecret) {
      Alert.alert(
        t('keys.alertMissingSecret'),
        t('importKey.alertMissingSecretMessage'),
      );
      return;
    }
    if (!normalizedExpected) {
      Alert.alert(
        t('importKey.alertFingerprintRequired'),
        t('importKey.alertFingerprintRequiredMessage'),
      );
      return;
    }

    if (!fingerprintMatches(trimmedSecret, normalizedExpected)) {
      Alert.alert(
        t('importKey.alertFingerprintMismatch'),
        t('importKey.alertFingerprintMismatchMessage'),
      );
      return;
    }

    const newKey: SavedKey = {
      id: generateSecureId(),
      name: trimmedName,
      secret: trimmedSecret,
      fingerprint: getFingerprint(trimmedSecret),
      createdAt: Date.now(),
    };

    const updated = await addKey(newKey);
    triggerLightHaptic();
    onKeyImported(updated);
    Alert.alert(
      t('qrScan.keyImported'),
      t('importKey.alertKeyImportedMessage', {name: trimmedName}),
    );
    handleClose();
  }, [
    expectedFingerprint,
    handleClose,
    name,
    onKeyImported,
    secret,
    t,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      onShow={resetForm}>
      <KeyboardAvoidingView
        style={[styles.flex, {backgroundColor: colors.background}]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.header}>
              <Text style={[styles.title, {color: colors.label}]}>
                {t('importKey.title')}
              </Text>
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t('importKey.closeA11y')}
                hitSlop={8}>
                <Text style={[styles.cancel, {color: colors.securityTint}]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
              {t('importKey.subtitle')}
            </Text>

            <InputField
              label={t('keys.keyName')}
              placeholder={t('keys.keyNamePlaceholder')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <InputField
              label={t('keys.passphrase')}
              placeholder={t('importKey.passphrasePlaceholder')}
              value={secret}
              onChangeText={setSecret}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              showPaste
              showToggleSecret
            />

            <InputField
              label={t('encrypt.fingerprint')}
              placeholder={t('importKey.fingerprintPlaceholder')}
              value={expectedFingerprint}
              onChangeText={setExpectedFingerprint}
              autoCapitalize="none"
              autoCorrect={false}
              showPaste
            />

            {fingerprintStatus === 'match' && (
              <Text style={[styles.verifyOk, {color: colors.securityTint}]}>
                {t('importKey.fingerprintMatch')}
              </Text>
            )}
            {fingerprintStatus === 'mismatch' && (
              <Text style={[styles.verifyBad, {color: colors.destructive}]}>
                {t('importKey.fingerprintMismatch')}
              </Text>
            )}

            <Button
              title={t('importKey.importKey')}
              onPress={handleImport}
              accessibilityLabel={t('importKey.importA11y')}
            />

            <Pressable
              onPress={handleScanQr}
              accessibilityRole="button"
              accessibilityLabel={t('importKey.scanQrA11y')}
              style={({pressed}) => [
                styles.altAction,
                {opacity: pressed ? 0.6 : 1},
              ]}>
              <Text style={[styles.altActionText, {color: colors.securityTint}]}>
                {t('importKey.scanQrInstead')}
              </Text>
            </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  cancel: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  verifyOk: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
  },
  verifyBad: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
  },
  altAction: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  altActionText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
