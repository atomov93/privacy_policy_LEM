import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {
  generateSecret,
  generateSecureId,
  getFingerprint,
} from '../services/cryptoService';
import {
  enableBiometricLockWithVerification,
  getBiometricLockSettingLabel,
  isBiometricAvailable,
  resolveAppLockState,
} from '../services/biometrics';
import {triggerLightHaptic} from '../services/haptics';
import {
  addKey,
  deleteKey,
  findDuplicateKey,
  namesMatch,
} from '../services/keyStorage';
import {MAX_KEY_NAME_LENGTH, MAX_SECRET_LENGTH} from '../services/limits';
import {
  getLanguage,
  setBiometricLockEnabled,
} from '../services/settingsStorage';
import {SavedKey} from '../types';
import {
  LanguagePicker,
  LanguageSettingRow,
} from './LanguagePicker';
import {QRScanModal} from './QRScanModal';
import {ImportKeyModal} from './ImportKeyModal';
import {QRShareModal} from './QRShareModal';
import {LmeShareModal} from './LmeShareModal';
import {LmeImportModal} from './LmeImportModal';
import {SwipeableKeyRow} from './SwipeableKeyRow';
import {
  ActionCard,
  ActionCardRow,
  Button,
  CopyField,
  InputField,
  QrIcon,
  Section,
  SectionRow,
  useContentLayout,
  useTheme,
} from './ui';

type KeyMode = 'create' | 'join';

interface CreateKeyTabProps {
  keys: SavedKey[];
  onKeysChange: (keys: SavedKey[]) => void;
  pendingLmeContents?: string | null;
  onPendingLmeConsumed?: () => void;
}

export function CreateKeyTab({
  keys,
  onKeysChange,
  pendingLmeContents = null,
  onPendingLmeConsumed,
}: CreateKeyTabProps) {
  const {colors} = useTheme();
  const {contentStyle} = useContentLayout();
  const {t, i18n} = useTranslation();
  const [keyMode, setKeyMode] = useState<KeyMode>('create');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [lastCreatedHash, setLastCreatedHash] = useState<string | null>(null);
  const [qrShareKey, setQrShareKey] = useState<SavedKey | null>(null);
  const [lmeShareKey, setLmeShareKey] = useState<SavedKey | null>(null);
  const [showQrScan, setShowQrScan] = useState(false);
  const [showImportKey, setShowImportKey] = useState(false);
  const [showLmeImport, setShowLmeImport] = useState(false);
  const [lmeImportContents, setLmeImportContents] = useState<string | null>(
    null,
  );
  const [biometricLockOn, setBiometricLockOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    resolveAppLockState().then(({available, enabled}) => {
      setBiometricAvailable(available);
      setBiometricLockOn(enabled);
    });
    getLanguage().then(lang => {
      if (lang) {
        setCurrentLanguage(lang);
      }
    });
  }, []);

  useEffect(() => {
    if (!pendingLmeContents) {
      return;
    }
    setKeyMode('join');
    setLmeImportContents(pendingLmeContents);
    setShowLmeImport(true);
    onPendingLmeConsumed?.();
  }, [onPendingLmeConsumed, pendingLmeContents]);

  const fingerprintPreview = useMemo(() => {
    const trimmed = secret.trim();
    return trimmed.length > 0 ? getFingerprint(trimmed) : null;
  }, [secret]);

  const handleGenerate = useCallback(() => {
    setSecret(generateSecret());
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim().slice(0, MAX_KEY_NAME_LENGTH);
    const trimmedSecret = secret.trim().slice(0, MAX_SECRET_LENGTH);

    if (!trimmedName) {
      Alert.alert(
        t('keys.alertMissingName'),
        t('keys.alertMissingNameMessage'),
      );
      return;
    }
    if (!trimmedSecret) {
      Alert.alert(
        t('keys.alertMissingSecret'),
        t('keys.alertMissingSecretMessage'),
      );
      return;
    }

    const fingerprint = getFingerprint(trimmedSecret);
    const newKey: SavedKey = {
      id: generateSecureId(),
      name: trimmedName,
      secret: trimmedSecret,
      fingerprint,
      createdAt: Date.now(),
    };

    const persist = async () => {
      try {
        const updated = await addKey(newKey);
        onKeysChange(updated);
        triggerLightHaptic();
        setLastCreatedHash(fingerprint);
        setName('');
        setSecret('');
        Alert.alert(
          t('keys.alertKeySaved'),
          t('keys.alertKeySavedMessage', {name: trimmedName}),
        );
      } catch {
        Alert.alert(t('keys.alertSaveFailed'), t('keys.alertSaveFailedMessage'));
      }
    };

    const existing = await findDuplicateKey(trimmedName, fingerprint);
    if (existing) {
      Alert.alert(
        t('keys.alertReplaceTitle'),
        namesMatch(existing.name, trimmedName)
          ? t('keys.alertReplaceMessage', {name: trimmedName})
          : t('keys.alertReplaceFingerprintMessage', {
              existingName: existing.name,
              name: trimmedName,
            }),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('keys.replace'),
            style: 'destructive',
            onPress: () => {
              void persist();
            },
          },
        ],
      );
      return;
    }

    await persist();
  }, [name, onKeysChange, secret, t]);

  const handleDelete = useCallback(
    async (key: SavedKey) => {
      try {
        const updated = await deleteKey(key.id);
        onKeysChange(updated);
      } catch {
        Alert.alert(t('keys.alertSaveFailed'), t('keys.alertSaveFailedMessage'));
      }
    },
    [onKeysChange, t],
  );

  const handleBiometricToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const available = await isBiometricAvailable();
        if (!available) {
          Alert.alert(
            t('settings.biometricUnavailableTitle'),
            t('settings.biometricUnavailableMessage'),
          );
          return;
        }
        const verified = await enableBiometricLockWithVerification();
        if (!verified) {
          Alert.alert(
            t('settings.biometricVerifyFailedTitle'),
            t('settings.biometricVerifyFailedMessage'),
          );
          return;
        }
      }
      try {
        setBiometricLockOn(enabled);
        await setBiometricLockEnabled(enabled);
      } catch {
        setBiometricLockOn(!enabled);
        Alert.alert(t('keys.alertSaveFailed'), t('keys.alertSaveFailedMessage'));
      }
    },
    [t],
  );

  const listHeader = (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View>
        <ActionCardRow>
          <ActionCard
            icon="🔐"
            title={t('keys.createKeyCard')}
            subtitle={t('keys.createKeyCardSubtitle')}
            selected={keyMode === 'create'}
            onPress={() => setKeyMode('create')}
            accessibilityLabel={t('keys.createKeyCardA11y')}
          />
          <ActionCard
            icon="🔗"
            title={t('keys.joinKeyCard')}
            subtitle={t('keys.joinKeyCardSubtitle')}
            selected={keyMode === 'join'}
            onPress={() => setKeyMode('join')}
            accessibilityLabel={t('keys.joinKeyCardA11y')}
          />
        </ActionCardRow>

        {keyMode === 'create' ? (
          <>
            <Section footer={t('keys.createNewKeyFooter')}>
              <SectionRow>
                <InputField
                  label={t('keys.keyName')}
                  placeholder={t('keys.keyNamePlaceholder')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  maxLength={MAX_KEY_NAME_LENGTH}
                />
              </SectionRow>
              <SectionRow isLast>
                <View
                  style={[
                    styles.secretFieldWrap,
                    {backgroundColor: colors.secretBackground},
                  ]}>
                  <InputField
                    label={t('keys.passphrase')}
                    placeholder={t('keys.passphrasePlaceholder')}
                    value={secret}
                    onChangeText={setSecret}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    showPaste
                    showCopy
                    showShare
                    showToggleSecret
                    maxLength={MAX_SECRET_LENGTH}
                  />
                </View>
              </SectionRow>
            </Section>

            {fingerprintPreview && (
              <View
                style={[
                  styles.previewCard,
                  {backgroundColor: colors.outputBackground},
                ]}>
                <CopyField
                  label={t('keys.fingerprintPreview')}
                  value={fingerprintPreview}
                  accessibilityLabel={t('keys.copyFingerprintPreviewA11y')}
                />
              </View>
            )}

            <View style={styles.buttonRow}>
              <Button
                title={t('common.generate')}
                variant="secondary"
                onPress={handleGenerate}
                flex
                accessibilityLabel={t('keys.generateSecretA11y')}
              />
              <Button
                title={t('common.saveKey')}
                variant="primary"
                onPress={handleSave}
                flex
                accessibilityLabel={t('keys.saveKeyA11y')}
              />
            </View>
          </>
        ) : (
          <>
            <ActionCardRow>
              <ActionCard
                iconNode={<QrIcon size={28} color={colors.securityTint} />}
                title={t('keys.scanQr')}
                subtitle={t('keys.scanQrCardSubtitle')}
                onPress={() => setShowQrScan(true)}
                accessibilityLabel={t('keys.scanQrA11y')}
              />
              <ActionCard
                icon="✏️"
                title={t('keys.enterManually')}
                subtitle={t('keys.enterManuallyCardSubtitle')}
                onPress={() => setShowImportKey(true)}
                accessibilityLabel={t('keys.enterManuallyA11y')}
              />
            </ActionCardRow>
            <ActionCardRow>
              <ActionCard
                icon="📄"
                title={t('keys.importLme')}
                subtitle={t('keys.importLmeSubtitle')}
                onPress={() => {
                  setLmeImportContents(null);
                  setShowLmeImport(true);
                }}
                accessibilityLabel={t('keys.importLmeA11y')}
              />
            </ActionCardRow>
            <Text style={[styles.sectionFooter, {color: colors.tertiaryLabel}]}>
              {t('keys.joinExistingKeyFooter')}
            </Text>
          </>
        )}

        {lastCreatedHash && (
          <View
            style={[
              styles.previewCard,
              {backgroundColor: colors.successBackground},
            ]}>
            <CopyField
              label={t('keys.lastSavedFingerprint')}
              value={lastCreatedHash}
              accessibilityLabel={t('keys.copyLastFingerprintA11y')}
            />
            <Text
              style={[styles.previewFooter, {color: colors.secondaryLabel}]}>
              {t('keys.lastSavedFingerprintFooter')}
            </Text>
          </View>
        )}

        <Section title={t('settings.title')}>
          <SectionRow>
            <LanguageSettingRow
              currentLanguage={currentLanguage}
              onPress={() => setShowLanguagePicker(true)}
            />
          </SectionRow>
          <SectionRow>
            <View
              style={[
                styles.settingRow,
                !biometricAvailable && styles.settingRowDisabled,
              ]}
              accessibilityState={{disabled: !biometricAvailable}}>
              <View style={styles.settingText}>
                <Text
                  style={[
                    styles.settingTitle,
                    {
                      color: biometricAvailable
                        ? colors.label
                        : colors.tertiaryLabel,
                    },
                  ]}>
                  {getBiometricLockSettingLabel()}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    {
                      color: biometricAvailable
                        ? colors.secondaryLabel
                        : colors.tertiaryLabel,
                    },
                  ]}>
                  {biometricAvailable
                    ? t('settings.biometricLockSubtitle')
                    : t('settings.biometricLockUnavailableSubtitle')}
                </Text>
              </View>
              <Switch
                value={biometricLockOn && biometricAvailable}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{false: colors.separator, true: colors.securityTint}}
                accessibilityLabel={t('settings.toggleBiometricLock')}
                accessibilityState={{disabled: !biometricAvailable}}
              />
            </View>
          </SectionRow>
          <SectionRow isLast>
            <Text
              style={[styles.settingSubtitle, {color: colors.tertiaryLabel}]}
              accessibilityRole="text">
              {t('settings.accessibilityNote')}
            </Text>
          </SectionRow>
        </Section>

        <Text
          style={[styles.listSectionTitle, {color: colors.secondaryLabel}]}
          accessibilityRole="header">
          {t('keys.savedKeys')}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <FlatList
        data={keys}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={[styles.emptyText, {color: colors.tertiaryLabel}]}>
              {t('keys.noKeysYet')}
            </Text>
          </View>
        }
        contentContainerStyle={[styles.scrollContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({item}) => (
          <SwipeableKeyRow
            item={item}
            onDelete={handleDelete}
            onShareQr={setQrShareKey}
            onShareLme={setLmeShareKey}
          />
        )}
      />

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />
      <QRShareModal
        keyItem={qrShareKey}
        visible={qrShareKey !== null}
        onClose={() => setQrShareKey(null)}
      />
      <LmeShareModal
        keyItem={lmeShareKey}
        visible={lmeShareKey !== null}
        onClose={() => setLmeShareKey(null)}
      />
      <QRScanModal
        visible={showQrScan}
        onClose={() => setShowQrScan(false)}
        onKeyImported={onKeysChange}
      />
      <ImportKeyModal
        visible={showImportKey}
        onClose={() => setShowImportKey(false)}
        onKeyImported={onKeysChange}
        onScanQr={() => setShowQrScan(true)}
      />
      <LmeImportModal
        visible={showLmeImport}
        onClose={() => {
          setShowLmeImport(false);
          setLmeImportContents(null);
        }}
        onKeyImported={onKeysChange}
        initialContents={lmeImportContents}
      />
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
    paddingBottom: 24,
  },
  secretFieldWrap: {
    marginHorizontal: -4,
    padding: 8,
    borderRadius: 8,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewFooter: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 16,
  },
  sectionFooter: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  listSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.08,
    marginBottom: 8,
    marginLeft: 16,
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRowDisabled: {
    opacity: 0.55,
  },
  settingText: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
