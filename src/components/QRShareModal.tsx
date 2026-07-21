import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {useTranslation} from 'react-i18next';

import {encodeKeyQrPayload, EncodedQrTransfer} from '../services/qrPayload';
import {SavedKey} from '../types';
import {Button, CopyField, useTheme} from './ui';

interface QRShareModalProps {
  keyItem: SavedKey | null;
  visible: boolean;
  onClose: () => void;
}

export function QRShareModal({keyItem, visible, onClose}: QRShareModalProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const [transfer, setTransfer] = useState<EncodedQrTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !keyItem) {
      setTransfer(null);
      setError(null);
      return;
    }
    try {
      setTransfer(encodeKeyQrPayload(keyItem));
      setError(null);
    } catch {
      setTransfer(null);
      setError(t('qrShare.encodeFailed'));
    }
  }, [keyItem, t, visible]);

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
        <Text style={[styles.title, {color: colors.label}]}>
          {t('qrShare.title')}
        </Text>
        <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
          {t('qrShare.subtitle', {name: keyItem.name})}
        </Text>

        {transfer ? (
          <>
            <View
              style={[
                styles.qrCard,
                {backgroundColor: colors.groupedBackground},
              ]}>
              <QRCode value={transfer.payload} size={280} ecl="M" />
            </View>

            <View style={styles.pinBlock}>
              <CopyField
                label={t('qrShare.transferPin')}
                value={transfer.pin}
                accessibilityLabel={t('qrShare.copyPinA11y')}
                showShare={false}
              />
              <Text style={[styles.warning, {color: colors.tertiaryLabel}]}>
                {t('qrShare.pinWarning')}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.warning, {color: colors.secondaryLabel}]}>
            {error ?? t('qrShare.encodeFailed')}
          </Text>
        )}

        <Button
          title={t('common.done')}
          onPress={onClose}
          accessibilityLabel={t('qrShare.closeA11y')}
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
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrCard: {
    padding: 24,
    borderRadius: 16,
    marginVertical: 8,
  },
  pinBlock: {
    width: '100%',
    gap: 8,
  },
  warning: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});
