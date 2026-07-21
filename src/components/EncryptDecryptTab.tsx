import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';

import {
  decryptMessage,
  encryptMessage,
  warmKeyDerivation,
} from '../services/cryptoService';
import {triggerLightHaptic} from '../services/haptics';
import {
  MAX_CIPHERTEXT_LENGTH,
  MAX_PLAINTEXT_LENGTH,
} from '../services/limits';
import {SavedKey} from '../types';
import {
  Button,
  CopyField,
  EmptyState,
  InputField,
  KeyPicker,
  Section,
  SectionRow,
  useContentLayout,
  useTheme,
} from './ui';

const LEGACY_HISTORY_KEY = '@lets_encrypt_app/history';

interface EncryptDecryptTabProps {
  keys: SavedKey[];
}

export function EncryptDecryptTab({keys}: EncryptDecryptTabProps) {
  const {colors} = useTheme();
  const {contentStyle} = useContentLayout();
  const {t} = useTranslation();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    keys[0]?.id ?? null,
  );
  const [plaintext, setPlaintext] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [encryptedOutput, setEncryptedOutput] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [fingerprintExpanded, setFingerprintExpanded] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [allowLegacyDecrypt, setAllowLegacyDecrypt] = useState(false);

  const selectedKey = useMemo(
    () => keys.find(key => key.id === selectedKeyId) ?? keys[0] ?? null,
    [keys, selectedKeyId],
  );

  const canEncrypt = plaintext.trim().length > 0 && !isEncrypting;
  const canDecrypt = ciphertext.trim().length > 0 && !isDecrypting;
  const canUseEncryptedOutput =
    encryptedOutput.length > 0 && ciphertext !== encryptedOutput;

  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_HISTORY_KEY);
  }, []);

  useEffect(() => {
    if (keys.length > 0 && !keys.some(key => key.id === selectedKeyId)) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  useEffect(() => {
    setFingerprintExpanded(false);
  }, [selectedKeyId]);

  useEffect(() => {
    if (selectedKey?.secret) {
      warmKeyDerivation(selectedKey.secret).catch(() => {});
    }
  }, [selectedKey?.secret]);

  const handleEncrypt = useCallback(async () => {
    if (!selectedKey) {
      Alert.alert(t('encrypt.alertNoKey'), t('encrypt.alertNoKeyMessage'));
      return;
    }
    if (!plaintext.trim()) {
      Alert.alert(
        t('encrypt.alertEmptyMessage'),
        t('encrypt.alertEmptyMessageText'),
      );
      return;
    }
    if (plaintext.length > MAX_PLAINTEXT_LENGTH) {
      Alert.alert(
        t('encrypt.alertTooLong'),
        t('encrypt.alertTooLongMessage'),
      );
      return;
    }
    setIsEncrypting(true);
    setDecryptedOutput('');
    try {
      const result = await encryptMessage(plaintext, selectedKey.secret);
      setEncryptedOutput(result);
      triggerLightHaptic();
    } catch {
      Alert.alert(
        t('encrypt.alertEncryptionFailed'),
        t('encrypt.alertEncryptionFailedMessage'),
      );
    } finally {
      setIsEncrypting(false);
    }
  }, [plaintext, selectedKey, t]);

  const handleDecrypt = useCallback(async () => {
    if (!selectedKey) {
      Alert.alert(t('encrypt.alertNoKey'), t('encrypt.alertNoKeyMessage'));
      return;
    }
    if (!ciphertext.trim()) {
      Alert.alert(
        t('encrypt.alertEmptyCiphertext'),
        t('encrypt.alertEmptyCiphertextMessage'),
      );
      return;
    }
    if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
      Alert.alert(
        t('encrypt.alertTooLong'),
        t('encrypt.alertTooLongMessage'),
      );
      return;
    }
    setIsDecrypting(true);
    try {
      const result = await decryptMessage(ciphertext, selectedKey.secret, {
        allowLegacy: allowLegacyDecrypt,
      });
      setDecryptedOutput(result);
      triggerLightHaptic();
    } catch {
      Alert.alert(
        t('encrypt.alertDecryptionFailed'),
        t('encrypt.alertDecryptionFailedMessage'),
      );
      setDecryptedOutput('');
    } finally {
      setIsDecrypting(false);
    }
  }, [allowLegacyDecrypt, ciphertext, selectedKey, t]);

  const handleUseEncryptedOutput = useCallback(() => {
    setCiphertext(encryptedOutput);
    setDecryptedOutput('');
    triggerLightHaptic();
  }, [encryptedOutput]);

  if (keys.length === 0) {
    return (
      <EmptyState
        title={t('encrypt.noKeysYet')}
        message={t('encrypt.noKeysYetMessage')}
        icon="🔒"
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <Section title={t('encrypt.key')}>
            <SectionRow>
              <KeyPicker
                keys={keys}
                selectedKey={selectedKey}
                onSelect={setSelectedKeyId}
              />
            </SectionRow>
            {selectedKey && (
              <SectionRow isLast>
                {fingerprintExpanded ? (
                  <View style={styles.fingerprintExpanded}>
                    <CopyField
                      label={t('encrypt.fingerprint')}
                      value={selectedKey.fingerprint}
                      accessibilityLabel={t('encrypt.copyFingerprintA11y')}
                    />
                    <Pressable
                      onPress={() => setFingerprintExpanded(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t('encrypt.hideFingerprintA11y')}
                      style={({pressed}) => [
                        styles.linkButton,
                        {opacity: pressed ? 0.6 : 1},
                      ]}>
                      <Text
                        style={[styles.linkText, {color: colors.securityTint}]}>
                        {t('encrypt.hide')}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setFingerprintExpanded(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('encrypt.showFingerprintA11y')}
                    style={({pressed}) => [
                      styles.linkButton,
                      {opacity: pressed ? 0.6 : 1},
                    ]}>
                    <Text
                      style={[styles.linkText, {color: colors.securityTint}]}>
                      {t('encrypt.showFingerprint')}
                    </Text>
                  </Pressable>
                )}
              </SectionRow>
            )}
          </Section>

          <Section
            title={t('encrypt.encrypt')}
            footer={t('encrypt.encryptFooter')}>
            <SectionRow>
              <InputField
                label={t('encrypt.messageLabel')}
                placeholder={t('encrypt.messagePlaceholder')}
                value={plaintext}
                onChangeText={setPlaintext}
                multiline
                autoComplete="off"
                textContentType="none"
                maxLength={MAX_PLAINTEXT_LENGTH}
                accessibilityLabel={t('encrypt.messageInputA11y')}
                style={styles.multiline}
              />
            </SectionRow>
            <SectionRow isLast>
              <Button
                title={
                  isEncrypting ? t('encrypt.encrypting') : t('encrypt.encrypt')
                }
                onPress={handleEncrypt}
                disabled={!canEncrypt}
                loading={isEncrypting}
                accessibilityLabel={t('encrypt.encryptA11y')}
              />
            </SectionRow>
          </Section>

          {encryptedOutput.length > 0 && (
            <View
              style={[
                styles.outputCard,
                {backgroundColor: colors.outputBackground},
              ]}
              accessibilityRole="text"
              accessibilityLabel={t('encrypt.ciphertextOutputA11y')}>
              <CopyField
                label={t('encrypt.ciphertext')}
                value={encryptedOutput}
                monospace={false}
                accessibilityLabel={t('encrypt.copyCiphertextA11y')}
              />
            </View>
          )}

          <Section
            title={t('encrypt.decrypt')}
            footer={t('encrypt.decryptFooter')}>
            {canUseEncryptedOutput && (
              <SectionRow>
                <Pressable
                  onPress={handleUseEncryptedOutput}
                  accessibilityRole="button"
                  accessibilityLabel={t('encrypt.useForDecryptionA11y')}
                  style={({pressed}) => [
                    styles.useOutputRow,
                    {backgroundColor: colors.securityBackground},
                    {opacity: pressed ? 0.75 : 1},
                  ]}>
                  <Text style={styles.useOutputIcon} accessibilityElementsHidden>
                    ↓
                  </Text>
                  <Text
                    style={[styles.useOutputText, {color: colors.securityTint}]}>
                    {t('encrypt.useForDecryption')}
                  </Text>
                </Pressable>
              </SectionRow>
            )}
            <SectionRow>
              <InputField
                label={t('encrypt.ciphertextLabel')}
                placeholder={t('encrypt.ciphertextPlaceholder')}
                value={ciphertext}
                onChangeText={text => {
                  setCiphertext(text);
                  if (decryptedOutput) {
                    setDecryptedOutput('');
                  }
                }}
                multiline
                monospace
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                maxLength={MAX_CIPHERTEXT_LENGTH}
                accessibilityLabel={t('encrypt.ciphertextInputA11y')}
                style={styles.multilineCiphertext}
              />
            </SectionRow>
            <SectionRow>
              <View style={styles.legacyRow}>
                <View style={styles.legacyText}>
                  <Text style={[styles.legacyTitle, {color: colors.label}]}>
                    {t('encrypt.legacyToggle')}
                  </Text>
                  <Text
                    style={[
                      styles.legacySubtitle,
                      {color: colors.secondaryLabel},
                    ]}>
                    {t('encrypt.legacyToggleSubtitle')}
                  </Text>
                </View>
                <Switch
                  value={allowLegacyDecrypt}
                  onValueChange={setAllowLegacyDecrypt}
                  trackColor={{false: colors.separator, true: colors.securityTint}}
                  accessibilityLabel={t('encrypt.legacyToggleA11y')}
                />
              </View>
            </SectionRow>
            <SectionRow isLast>
              <Button
                title={
                  isDecrypting ? t('encrypt.decrypting') : t('encrypt.decrypt')
                }
                onPress={handleDecrypt}
                disabled={!canDecrypt}
                loading={isDecrypting}
                accessibilityLabel={t('encrypt.decryptA11y')}
              />
            </SectionRow>
          </Section>

          {decryptedOutput.length > 0 && (
            <View
              style={[
                styles.outputCard,
                {backgroundColor: colors.successBackground},
              ]}
              accessibilityRole="text"
              accessibilityLabel={t('encrypt.decryptedOutputA11y')}
              accessibilityLiveRegion="polite">
              <CopyField
                label={t('encrypt.decryptedMessage')}
                value={decryptedOutput}
                monospace={false}
                accessibilityLabel={t('encrypt.copyDecryptedA11y')}
              />
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  multilineCiphertext: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  outputCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  fingerprintExpanded: {
    gap: 8,
  },
  linkButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  useOutputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: -4,
  },
  useOutputIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  useOutputText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legacyText: {
    flex: 1,
    gap: 4,
  },
  legacyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  legacySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
