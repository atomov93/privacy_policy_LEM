import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {SavedKey} from '../../types';
import {MIN_TOUCH_TARGET, useTheme} from './theme';

interface KeyPickerProps {
  keys: SavedKey[];
  selectedKey: SavedKey | null;
  onSelect: (keyId: string) => void;
}

export function KeyPicker({keys, selectedKey, onSelect}: KeyPickerProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('keyPicker.selectedA11y', {
          name: selectedKey?.name ?? t('common.none'),
        })}
        style={({pressed}) => [
          styles.trigger,
          {
            backgroundColor: colors.groupedBackground,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.triggerContent}>
          <Text style={[styles.triggerLabel, {color: colors.secondaryLabel}]}>
            {t('keyPicker.key')}
          </Text>
          <Text style={[styles.triggerValue, {color: colors.label}]}>
            {selectedKey?.name ?? t('keyPicker.selectKey')}
          </Text>
        </View>
        <Text style={[styles.chevron, {color: colors.tertiaryLabel}]}>›</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
          accessibilityLabel={t('keyPicker.dismiss')}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.groupedBackground,
              paddingBottom: insets.bottom + 8,
            },
          ]}>
          <View
            style={[
              styles.sheetHandle,
              {backgroundColor: colors.separator},
            ]}
          />
          <Text style={[styles.sheetTitle, {color: colors.label}]}>
            {t('keyPicker.selectKeyTitle')}
          </Text>
          {keys.map((key, index) => {
            const isSelected = key.id === selectedKey?.id;
            const isLast = index === keys.length - 1;
            return (
              <Pressable
                key={key.id}
                onPress={() => {
                  onSelect(key.id);
                  setVisible(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${key.name}${isSelected ? t('keyPicker.optionSelected') : ''}`}
                accessibilityState={{selected: isSelected}}
                style={({pressed}) => [
                  styles.option,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.separator,
                  },
                  {opacity: pressed ? 0.7 : 1},
                ]}>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionName,
                      {color: colors.label},
                      isSelected && {color: colors.securityTint},
                    ]}>
                    {key.name}
                  </Text>
                  <Text
                    style={[styles.optionHash, {color: colors.tertiaryLabel}]}
                    numberOfLines={1}>
                    {key.fingerprint}
                  </Text>
                </View>
                {isSelected && (
                  <Text style={[styles.checkmark, {color: colors.securityTint}]}>
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={({pressed}) => [
              styles.cancelButton,
              {
                backgroundColor: colors.fill,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text style={[styles.cancelText, {color: colors.securityTint}]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: MIN_TOUCH_TARGET + 8,
  },
  triggerContent: {
    flex: 1,
    paddingVertical: 10,
  },
  triggerLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  triggerValue: {
    fontSize: 17,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET + 4,
    paddingVertical: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 17,
    fontWeight: '500',
  },
  optionHash: {
    fontSize: 12,
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 12,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
