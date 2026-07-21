import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {authenticateToRevealSecret} from '../services/biometrics';
import {triggerLightHaptic} from '../services/haptics';
import {SavedKey} from '../types';
import {
  CopyField,
  MenuRow,
  QrIcon,
  Section,
  SectionRow,
  SheetHeader,
  useSheetInsets,
  useTheme,
} from './ui';

function concealValue(value: string): string {
  if (value.length <= 12) {
    return '••••••••';
  }
  return `${value.slice(0, 8)}···${value.slice(-4)}`;
}

interface KeyDetailModalProps {
  keyItem: SavedKey | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (key: SavedKey) => void;
  onShareQr: (key: SavedKey) => void;
  onShareLme: (key: SavedKey) => void;
}

export function KeyDetailModal({
  keyItem,
  visible,
  onClose,
  onDelete,
  onShareQr,
  onShareLme,
}: KeyDetailModalProps) {
  const {colors} = useTheme();
  const {contentPadding} = useSheetInsets();
  const {t} = useTranslation();
  const [fingerprintExpanded, setFingerprintExpanded] = useState(false);
  const [passphraseVisible, setPassphraseVisible] = useState(false);
  const [isRevealingPassphrase, setIsRevealingPassphrase] = useState(false);

  useEffect(() => {
    if (!visible) {
      setFingerprintExpanded(false);
      setPassphraseVisible(false);
    }
  }, [visible, keyItem?.id]);

  const handleRevealPassphrase = useCallback(async () => {
    if (!keyItem || isRevealingPassphrase) {
      return;
    }

    setIsRevealingPassphrase(true);
    try {
      const authenticated = await authenticateToRevealSecret();
      if (authenticated) {
        setPassphraseVisible(true);
        triggerLightHaptic();
      }
    } finally {
      setIsRevealingPassphrase(false);
    }
  }, [isRevealingPassphrase, keyItem]);

  const handleDelete = useCallback(() => {
    if (!keyItem) {
      return;
    }

    Alert.alert(
      t('keyRow.deleteKey'),
      t('keyRow.deleteKeyMessage', {name: keyItem.name}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            triggerLightHaptic();
            onClose();
            onDelete(keyItem);
          },
        },
      ],
    );
  }, [keyItem, onClose, onDelete, t]);

  const handleShareQr = useCallback(() => {
    if (!keyItem) {
      return;
    }
    onClose();
    onShareQr(keyItem);
  }, [keyItem, onClose, onShareQr]);

  const handleShareLme = useCallback(() => {
    if (!keyItem) {
      return;
    }
    onClose();
    onShareLme(keyItem);
  }, [keyItem, onClose, onShareLme]);

  if (!keyItem) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <SheetHeader
          title={keyItem.name}
          actionLabel={t('common.done')}
          onAction={onClose}
          actionAccessibilityLabel={t('keyRow.closeDetailsA11y')}
        />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentPadding]}
          keyboardShouldPersistTaps="handled">
          <Section
            title={t('keyRow.sectionVerify')}
            footer={t('keyRow.sectionVerifyFooter')}>
            {fingerprintExpanded ? (
              <SectionRow isLast>
                <View style={styles.expandedBlock}>
                  <CopyField
                    label={t('keyRow.fingerprint')}
                    value={keyItem.fingerprint}
                    accessibilityLabel={t('keyRow.copyFingerprintA11y', {
                      name: keyItem.name,
                    })}
                  />
                  <Pressable
                    onPress={() => setFingerprintExpanded(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t('keyRow.hideFingerprintA11y', {
                      name: keyItem.name,
                    })}
                    style={({pressed}) => [
                      styles.inlineLink,
                      {opacity: pressed ? 0.6 : 1},
                    ]}>
                    <Text
                      style={[styles.inlineLinkText, {color: colors.securityTint}]}>
                      {t('keyRow.hideFingerprint')}
                    </Text>
                  </Pressable>
                </View>
              </SectionRow>
            ) : (
              <SectionRow isLast>
                <MenuRow
                  icon="🪪"
                  title={t('keyRow.fingerprint')}
                  subtitle={concealValue(keyItem.fingerprint)}
                  onPress={() => setFingerprintExpanded(true)}
                  accessibilityLabel={t('keyRow.showFingerprintA11y', {
                    name: keyItem.name,
                  })}
                  accessibilityHint={t('keyRow.fingerprintHint')}
                />
              </SectionRow>
            )}
          </Section>

          <Section
            title={t('keyRow.sectionSecret')}
            footer={t('keyRow.sectionSecretFooter')}>
            {passphraseVisible ? (
              <SectionRow isLast>
                <View
                  style={[
                    styles.expandedBlock,
                    styles.secretBlock,
                    {backgroundColor: colors.secretBackground},
                  ]}>
                  <CopyField
                    label={t('keyRow.passphrase')}
                    value={keyItem.secret}
                    monospace={false}
                    accessibilityLabel={t('keyRow.copyPassphraseA11y', {
                      name: keyItem.name,
                    })}
                  />
                  <Pressable
                    onPress={() => setPassphraseVisible(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t('keyRow.hidePassphraseA11y', {
                      name: keyItem.name,
                    })}
                    style={({pressed}) => [
                      styles.inlineLink,
                      {opacity: pressed ? 0.6 : 1},
                    ]}>
                    <Text
                      style={[styles.inlineLinkText, {color: colors.securityTint}]}>
                      {t('keyRow.hidePassphrase')}
                    </Text>
                  </Pressable>
                </View>
              </SectionRow>
            ) : (
              <SectionRow isLast>
                <MenuRow
                  icon="🔏"
                  title={t('keyRow.revealPassphrase')}
                  subtitle={t('keyRow.passphraseMenuSubtitle')}
                  onPress={handleRevealPassphrase}
                  accessibilityLabel={t('keyRow.revealPassphraseA11y', {
                    name: keyItem.name,
                  })}
                  accessibilityHint={t('keyRow.passphraseHint')}
                />
              </SectionRow>
            )}
          </Section>

          <Section
            title={t('keyRow.sectionShare')}
            footer={t('keyRow.sectionShareFooter')}>
            <SectionRow>
              <MenuRow
                iconNode={<QrIcon color={colors.securityTint} />}
                title={t('keyRow.shareQr')}
                subtitle={t('keyRow.shareQrSubtitle')}
                onPress={handleShareQr}
                accessibilityLabel={t('keyRow.shareViaQr', {
                  name: keyItem.name,
                })}
                accessibilityHint={t('keyRow.shareQrHint')}
              />
            </SectionRow>
            <SectionRow isLast>
              <MenuRow
                icon="📄"
                title={t('keyRow.shareLme')}
                subtitle={t('keyRow.shareLmeSubtitle')}
                onPress={handleShareLme}
                accessibilityLabel={t('keyRow.shareViaLme', {
                  name: keyItem.name,
                })}
                accessibilityHint={t('keyRow.shareLmeHint')}
              />
            </SectionRow>
          </Section>

          <Section title={t('keyRow.sectionDanger')}>
            <SectionRow isLast>
              <MenuRow
                icon="🗑️"
                title={t('keyRow.deleteKey')}
                subtitle={t('keyRow.deleteKeySubtitle')}
                onPress={handleDelete}
                destructive
                showChevron={false}
                accessibilityLabel={t('keyRow.deleteKeyA11y', {
                  name: keyItem.name,
                })}
              />
            </SectionRow>
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  expandedBlock: {
    gap: 8,
    width: '100%',
  },
  secretBlock: {
    marginHorizontal: -16,
    marginVertical: -12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 0,
  },
  inlineLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  inlineLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
