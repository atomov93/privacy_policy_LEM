import React, {useCallback} from 'react';
import {Modal, StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {useTranslation} from 'react-i18next';

import {encodeKeyQrPayload} from '../services/qrPayload';
import {SavedKey} from '../types';
import {Button, useTheme} from './ui';

interface QRShareModalProps {
  keyItem: SavedKey | null;
  visible: boolean;
  onClose: () => void;
}

export function QRShareModal({keyItem, visible, onClose}: QRShareModalProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();

  const qrValue = keyItem ? encodeKeyQrPayload(keyItem) : '';

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
      onRequestClose={handleClose}>
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <Text style={[styles.title, {color: colors.label}]}>
          {t('qrShare.title')}
        </Text>
        <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
          {t('qrShare.subtitle', {name: keyItem.name})}
        </Text>

        <View
          style={[
            styles.qrCard,
            {backgroundColor: colors.groupedBackground},
          ]}>
          <QRCode value={qrValue} size={280} ecl="M" />
        </View>

        <Text style={[styles.warning, {color: colors.tertiaryLabel}]}>
          {t('qrShare.warning')}
        </Text>

        <Button
          title={t('common.done')}
          onPress={handleClose}
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
  warning: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});
