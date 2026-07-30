import React, {useCallback, useEffect, useState} from 'react';
import {Alert, Modal, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {generateSecureId, getFingerprint} from '../services/cryptoService';
import {triggerLightHaptic} from '../services/haptics';
import {
  addKey,
  findDuplicateKey,
  namesMatch,
} from '../services/keyStorage';
import {LME_MIN_PASSPHRASE_LENGTH, MAX_KEY_NAME_LENGTH} from '../services/limits';
import {decodeLmeFile, isLmeFileContents} from '../services/lmeFile';
import {pickAndReadLmeFile} from '../services/lmeFileIO';
import {SavedKey} from '../types';
import {Button, InputField, useTheme} from './ui';

interface LmeImportModalProps {
  visible: boolean;
  onClose: () => void;
  onKeyImported: (keys: SavedKey[]) => void;
  /** When set (e.g. from a file open intent), skip the document picker. */
  initialContents?: string | null;
}

export function LmeImportModal({
  visible,
  onClose,
  onKeyImported,
  initialContents = null,
}: LmeImportModalProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const [rawContents, setRawContents] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [keyName, setKeyName] = useState('');
  const [pending, setPending] = useState<Pick<
    SavedKey,
    'name' | 'secret' | 'fingerprint'
  > | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setRawContents(null);
    setPassphrase('');
    setKeyName('');
    setPending(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    if (initialContents) {
      if (!isLmeFileContents(initialContents)) {
        Alert.alert(t('lmeImport.invalidFile'), t('lmeImport.invalidFileMessage'));
        onClose();
        return;
      }
      setRawContents(initialContents);
    }
  }, [initialContents, onClose, reset, t, visible]);

  const handlePick = useCallback(async () => {
    setBusy(true);
    try {
      const contents = await pickAndReadLmeFile();
      if (!contents) {
        return;
      }
      if (!isLmeFileContents(contents)) {
        Alert.alert(t('lmeImport.invalidFile'), t('lmeImport.invalidFileMessage'));
        return;
      }
      setRawContents(contents);
      setPending(null);
      setPassphrase('');
    } catch {
      Alert.alert(t('lmeImport.readFailed'), t('lmeImport.readFailedMessage'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleUnlock = useCallback(async () => {
    if (!rawContents) {
      return;
    }
    if (passphrase.trim().length < LME_MIN_PASSPHRASE_LENGTH) {
      Alert.alert(
        t('lmeImport.passphraseTooShort'),
        t('lmeImport.passphraseTooShortMessage', {
          min: LME_MIN_PASSPHRASE_LENGTH,
        }),
      );
      return;
    }
    const decoded = await decodeLmeFile(rawContents, passphrase);
    if (!decoded) {
      Alert.alert(t('lmeImport.unlockFailed'), t('lmeImport.unlockFailedMessage'));
      return;
    }
    setPending(decoded);
    setKeyName(decoded.name);
    triggerLightHaptic();
  }, [passphrase, rawContents, t]);

  const persist = useCallback(
    async (trimmedName: string, payload: NonNullable<typeof pending>) => {
      const newKey: SavedKey = {
        id: generateSecureId(),
        name: trimmedName,
        secret: payload.secret,
        fingerprint: getFingerprint(payload.secret),
        createdAt: Date.now(),
      };
      try {
        const updated = await addKey(newKey);
        triggerLightHaptic();
        onKeyImported(updated);
        Alert.alert(
          t('qrScan.keyImported'),
          t('lmeImport.importedMessage', {name: trimmedName}),
        );
        reset();
        onClose();
      } catch {
        Alert.alert(t('keys.alertSaveFailed'), t('keys.alertSaveFailedMessage'));
      }
    },
    [onClose, onKeyImported, reset, t],
  );

  const handleSave = useCallback(async () => {
    if (!pending) {
      return;
    }
    const trimmedName = keyName.trim().slice(0, MAX_KEY_NAME_LENGTH);
    if (!trimmedName) {
      Alert.alert(t('keys.alertMissingName'), t('keys.alertMissingNameMessage'));
      return;
    }
    const fingerprint = getFingerprint(pending.secret);
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
              void persist(trimmedName, pending);
            },
          },
        ],
      );
      return;
    }
    await persist(trimmedName, pending);
  }, [keyName, pending, persist, t]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      accessibilityViewIsModal>
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, {color: colors.label}]}>
          {t('lmeImport.title')}
        </Text>
        <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
          {t('lmeImport.subtitle')}
        </Text>

        {!rawContents && (
          <Button
            title={busy ? t('lmeImport.opening') : t('lmeImport.chooseFile')}
            onPress={handlePick}
            disabled={busy}
            accessibilityLabel={t('lmeImport.chooseFileA11y')}
          />
        )}

        {rawContents && !pending && (
          <>
            <InputField
              label={t('lmeShare.transferPassphrase')}
              placeholder={t('lmeImport.passphrasePlaceholder')}
              value={passphrase}
              onChangeText={setPassphrase}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              showToggleSecret
              showPaste
            />
            <Button
              title={t('lmeImport.unlock')}
              onPress={handleUnlock}
              accessibilityLabel={t('lmeImport.unlockA11y')}
            />
            {!initialContents && (
              <Button
                title={t('lmeImport.chooseDifferent')}
                variant="secondary"
                onPress={() => {
                  setRawContents(null);
                  setPassphrase('');
                }}
              />
            )}
          </>
        )}

        {pending && (
          <>
            <InputField
              label={t('keys.keyName')}
              placeholder={t('keys.keyNamePlaceholder')}
              value={keyName}
              onChangeText={setKeyName}
              autoCapitalize="words"
              maxLength={MAX_KEY_NAME_LENGTH}
            />
            <Text style={[styles.meta, {color: colors.tertiaryLabel}]}>
              {t('lmeImport.fingerprintPreview', {
                fingerprint: pending.fingerprint.slice(0, 16),
              })}
            </Text>
            <Button
              title={t('common.saveKey')}
              onPress={handleSave}
              accessibilityLabel={t('lmeImport.saveA11y')}
            />
          </>
        )}

        <Button
          title={t('common.cancel')}
          variant="secondary"
          onPress={handleClose}
          accessibilityLabel={t('lmeImport.closeA11y')}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    fontFamily: 'Menlo',
  },
});
