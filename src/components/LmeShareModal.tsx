import React, {useCallback, useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {triggerLightHaptic} from '../services/haptics';
import {encodeLmeFile} from '../services/lmeFile';
import {shareLmeFile, writeLmeTempFile} from '../services/lmeFileIO';
import {SavedKey} from '../types';
import {Button, CopyField, useTheme} from './ui';

interface LmeShareModalProps {
  keyItem: SavedKey | null;
  visible: boolean;
  onClose: () => void;
}

export function LmeShareModal({keyItem, visible, onClose}: LmeShareModalProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!visible || !keyItem) {
      setPassphrase(null);
      setFilename(null);
      setFilePath(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const encoded = await encodeLmeFile(keyItem);
        const path = await writeLmeTempFile(encoded.contents, encoded.filename);
        if (cancelled) {
          return;
        }
        setPassphrase(encoded.passphrase);
        setFilename(encoded.filename);
        setFilePath(path);
        setError(null);
      } catch {
        if (!cancelled) {
          setError(t('lmeShare.encodeFailed'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keyItem, t, visible]);

  const handleShare = useCallback(async () => {
    if (!filePath || !filename || sharing) {
      return;
    }
    setSharing(true);
    try {
      const shared = await shareLmeFile(filePath, filename);
      if (shared) {
        triggerLightHaptic();
      }
    } finally {
      setSharing(false);
    }
  }, [filePath, filename, sharing]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!keyItem) {
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
          {t('lmeShare.title')}
        </Text>
        <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
          {t('lmeShare.subtitle', {name: keyItem.name})}
        </Text>

        {passphrase && filename ? (
          <>
            <Text style={[styles.meta, {color: colors.tertiaryLabel}]}>
              {t('lmeShare.filename', {filename})}
            </Text>
            <View style={styles.pinBlock}>
              <CopyField
                label={t('lmeShare.transferPassphrase')}
                value={passphrase}
                accessibilityLabel={t('lmeShare.copyPassphraseA11y')}
                showShare={false}
              />
              <Text style={[styles.warning, {color: colors.tertiaryLabel}]}>
                {t('lmeShare.passphraseWarning')}
              </Text>
            </View>
            <Button
              title={sharing ? t('lmeShare.sharing') : t('lmeShare.shareFile')}
              onPress={handleShare}
              disabled={sharing}
              accessibilityLabel={t('lmeShare.shareFileA11y')}
            />
          </>
        ) : (
          <Text style={[styles.warning, {color: colors.secondaryLabel}]}>
            {error ?? t('lmeShare.preparing')}
          </Text>
        )}

        <Button
          title={t('common.done')}
          variant="secondary"
          onPress={handleClose}
          accessibilityLabel={t('lmeShare.closeA11y')}
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
  pinBlock: {
    width: '100%',
    gap: 8,
  },
  warning: {
    fontSize: 13,
    lineHeight: 18,
  },
});
