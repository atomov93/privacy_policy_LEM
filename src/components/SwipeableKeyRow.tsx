import React, {useCallback, useState} from 'react';
import {Pressable, Platform, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {triggerLightHaptic} from '../services/haptics';
import {SavedKey} from '../types';
import {KeyDetailModal} from './KeyDetailModal';
import {EmojiIcon, QrIcon, useTheme} from './ui';

function concealValue(value: string): string {
  if (value.length <= 12) {
    return '••••••••';
  }
  return `${value.slice(0, 8)}···${value.slice(-4)}`;
}

interface SwipeableKeyRowProps {
  item: SavedKey;
  onDelete: (key: SavedKey) => void;
  onShareQr: (key: SavedKey) => void;
  onShareLme: (key: SavedKey) => void;
}

export function SwipeableKeyRow({
  item,
  onDelete,
  onShareQr,
  onShareLme,
}: SwipeableKeyRowProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const openDetails = useCallback(() => {
    triggerLightHaptic();
    setShowDetails(true);
  }, []);

  const handleQuickShare = useCallback(() => {
    triggerLightHaptic();
    onShareQr(item);
  }, [item, onShareQr]);

  return (
    <>
      <View style={[styles.keyCard, {backgroundColor: colors.groupedBackground}]}>
        <Pressable
          onPress={openDetails}
          accessibilityRole="button"
          accessibilityLabel={t('keyRow.openDetailsA11y', {name: item.name})}
          accessibilityHint={t('keyRow.openDetailsHint')}
          style={({pressed}) => [
            styles.summaryPressable,
            {opacity: pressed ? 0.85 : 1},
          ]}>
          <View style={styles.summaryTop}>
            <View
              style={[
                styles.secureBadge,
                {backgroundColor: colors.securityBackground},
              ]}
              accessibilityElementsHidden>
              <EmojiIcon emoji="🔒" size={17} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.keyName, {color: colors.label}]}>
                {item.name}
              </Text>
              <Text style={[styles.fingerprintPreview, {color: colors.secondaryLabel}]}>
                {concealValue(item.fingerprint)}
              </Text>
            </View>
            <Text
              style={[styles.chevron, {color: colors.tertiaryLabel}]}
              accessibilityElementsHidden>
              ›
            </Text>
          </View>
          <Text style={[styles.manageHint, {color: colors.tertiaryLabel}]}>
            {t('keyRow.manageHint')}
          </Text>
        </Pressable>

        <View style={[styles.quickActions, {borderTopColor: colors.separator}]}>
          <Pressable
            onPress={handleQuickShare}
            accessibilityRole="button"
            accessibilityLabel={t('keyRow.shareViaQr', {name: item.name})}
            style={({pressed}) => [
              styles.quickAction,
              {backgroundColor: colors.securityBackground},
              {opacity: pressed ? 0.75 : 1},
            ]}>
            <QrIcon size={18} color={colors.securityTint} />
            <Text style={[styles.quickActionLabel, {color: colors.securityTint}]}>
              {t('keyRow.shareQr')}
            </Text>
          </Pressable>
          <Pressable
            onPress={openDetails}
            accessibilityRole="button"
            accessibilityLabel={t('keyRow.viewDetailsA11y', {name: item.name})}
            style={({pressed}) => [
              styles.quickAction,
              {backgroundColor: colors.fill},
              {opacity: pressed ? 0.75 : 1},
            ]}>
            <EmojiIcon emoji="⚙️" size={16} />
            <Text style={[styles.quickActionLabel, {color: colors.label}]}>
              {t('keyRow.viewDetails')}
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyDetailModal
        keyItem={item}
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        onDelete={onDelete}
        onShareQr={onShareQr}
        onShareLme={onShareLme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  keyCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  summaryPressable: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 6,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secureBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureBadgeText: {
    fontSize: 17,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  keyName: {
    fontSize: 17,
    fontWeight: '600',
  },
  fingerprintPreview: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  manageHint: {
    fontSize: 12,
    marginLeft: 48,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
