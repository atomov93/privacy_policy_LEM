import React, {useCallback, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {changeAppLanguage} from '../i18n';
import {EU_LANGUAGES, getLanguageNativeName} from '../i18n/languages';
import {setLanguage} from '../services/settingsStorage';
import {MIN_TOUCH_TARGET, SheetHeader, useSheetInsets, useTheme} from './ui';

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
}

export function LanguagePicker({
  visible,
  onClose,
  currentLanguage,
  onLanguageChange,
}: LanguagePickerProps) {
  const {colors} = useTheme();
  const {contentPadding} = useSheetInsets();
  const {t} = useTranslation();
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const sortedLanguages = useMemo(
    () =>
      [...EU_LANGUAGES].sort((a, b) =>
        a.nativeName.localeCompare(b.nativeName, undefined, {
          sensitivity: 'base',
        }),
      ),
    [],
  );

  const handleSelect = useCallback(
    async (code: string) => {
      if (code === currentLanguage) {
        onClose();
        return;
      }

      setPendingCode(code);
      try {
        await setLanguage(code);
        await changeAppLanguage(code);
        onLanguageChange(code);
        onClose();
      } finally {
        setPendingCode(null);
      }
    },
    [currentLanguage, onClose, onLanguageChange],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <SheetHeader
          title={t('settings.selectLanguage')}
          actionLabel={t('common.cancel')}
          onAction={onClose}
          actionAccessibilityLabel={t('common.cancel')}
        />

        <Text
          style={[
            styles.headerSubtitle,
            {color: colors.secondaryLabel},
            {
              paddingLeft: contentPadding.paddingLeft,
              paddingRight: contentPadding.paddingRight,
            },
          ]}>
          {t('settings.languageSubtitle')}
        </Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingLeft: contentPadding.paddingLeft,
              paddingRight: contentPadding.paddingRight,
              paddingBottom: contentPadding.paddingBottom,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.card,
              {backgroundColor: colors.groupedBackground},
            ]}>
            {sortedLanguages.map((language, index) => {
              const isSelected = language.code === currentLanguage;
              const isPending = language.code === pendingCode;
              const isLast = index === sortedLanguages.length - 1;

              return (
                <Pressable
                  key={language.code}
                  onPress={() => handleSelect(language.code)}
                  disabled={pendingCode !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`${language.nativeName}${isSelected ? t('keyPicker.optionSelected') : ''}`}
                  accessibilityState={{selected: isSelected, busy: isPending}}
                  style={({pressed}) => [
                    styles.row,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.separator,
                    },
                    {opacity: pressed || isPending ? 0.7 : 1},
                  ]}>
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.nativeName,
                        {color: colors.label},
                        isSelected && {color: colors.securityTint},
                      ]}>
                      {language.nativeName}
                    </Text>
                    <Text
                      style={[
                        styles.englishName,
                        {color: colors.tertiaryLabel},
                      ]}>
                      {language.englishName}
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface LanguageSettingRowProps {
  currentLanguage: string;
  onPress: () => void;
}

export function LanguageSettingRow({
  currentLanguage,
  onPress,
}: LanguageSettingRowProps) {
  const {colors} = useTheme();
  const {t} = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('settings.language')}, ${getLanguageNativeName(currentLanguage)}`}
      style={({pressed}) => [
        styles.settingRow,
        {opacity: pressed ? 0.7 : 1},
      ]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, {color: colors.label}]}>
          {t('settings.language')}
        </Text>
        <Text style={[styles.settingSubtitle, {color: colors.secondaryLabel}]}>
          {t('settings.languageSubtitle')}
        </Text>
      </View>
      <View style={styles.settingValue}>
        <Text style={[styles.settingValueText, {color: colors.secondaryLabel}]}>
          {getLanguageNativeName(currentLanguage)}
        </Text>
        <Text style={[styles.chevron, {color: colors.tertiaryLabel}]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  nativeName: {
    fontSize: 17,
    fontWeight: '400',
  },
  englishName: {
    fontSize: 13,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 17,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
