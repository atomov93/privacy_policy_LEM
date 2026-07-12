import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {CreateKeyTab} from './src/components/CreateKeyTab';
import {EncryptDecryptTab} from './src/components/EncryptDecryptTab';
import {LockScreen} from './src/components/LockScreen';
import {ToastProvider, useContentLayout, EmojiIcon, useTheme} from './src/components/ui';
import {initI18n} from './src/i18n';
import {authenticateWithBiometrics} from './src/services/biometrics';
import {loadKeys} from './src/services/keyStorage';
import {
  getLanguage,
  isBiometricLockEnabled,
} from './src/services/settingsStorage';
import {SavedKey} from './src/types';

type Tab = 'keys' | 'encrypt';

function AppContent() {
  const {colors, isDark} = useTheme();
  const {contentStyle} = useContentLayout();
  const {t, i18n} = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('keys');
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
  const [locked, setLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticatingRef = useRef(false);

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nReady(true);
      return;
    }

    getLanguage()
      .then(savedLanguage => initI18n(savedLanguage))
      .finally(() => setI18nReady(true));
  }, [i18n.isInitialized]);

  const handleUnlock = useCallback(async () => {
    if (isAuthenticatingRef.current) {
      return;
    }

    isAuthenticatingRef.current = true;
    try {
      const enabled = await isBiometricLockEnabled();
      if (!enabled) {
        setLocked(false);
        return;
      }

      const success = await authenticateWithBiometrics();
      if (success) {
        setLocked(false);
      }
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  const handleUnlockRef = useRef(handleUnlock);
  handleUnlockRef.current = handleUnlock;

  const promptUnlockIfNeeded = useCallback(async () => {
    const enabled = await isBiometricLockEnabled();
    if (!enabled) {
      setLocked(false);
      return;
    }
    setLocked(true);
    await handleUnlockRef.current();
  }, []);

  useEffect(() => {
    if (!i18nReady) {
      return;
    }

    loadKeys()
      .then(setKeys)
      .finally(() => setLoading(false));

    promptUnlockIfNeeded();
  }, [i18nReady, promptUnlockIfNeeded]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background') {
        isBiometricLockEnabled().then(enabled => {
          if (enabled) {
            setLocked(true);
          }
        });
        return;
      }

      if (previousState === 'background' && nextState === 'active') {
        promptUnlockIfNeeded();
      }
    });

    return () => subscription.remove();
  }, [promptUnlockIfNeeded]);

  const handleKeysChange = useCallback((updated: SavedKey[]) => {
    setKeys(updated);
  }, []);

  if (!i18nReady) {
    return (
      <View style={[styles.root, styles.loading, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color={colors.securityTint} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={[styles.safeArea, {backgroundColor: colors.background}]}
        edges={['top', 'left', 'right']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.header, contentStyle]}>
            <Text
              style={[styles.title, {color: colors.label}]}
              accessibilityRole="header">
              {t('app.title')}
            </Text>
            <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
              {t('app.subtitle')}
            </Text>
          </View>
        </TouchableWithoutFeedback>

        <View style={[styles.content, contentStyle]}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.securityTint} />
            </View>
          ) : activeTab === 'keys' ? (
            <CreateKeyTab keys={keys} onKeysChange={handleKeysChange} />
          ) : (
            <EncryptDecryptTab keys={keys} />
          )}
        </View>

        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.tabBarContainer,
            {
              backgroundColor: colors.groupedBackground,
              borderTopColor: colors.separator,
            },
          ]}>
          <View style={styles.tabBar}>
            <Pressable
              style={styles.tab}
              onPress={() => setActiveTab('keys')}
              accessibilityRole="tab"
              accessibilityLabel={t('tabs.keysA11y')}
              accessibilityState={{selected: activeTab === 'keys'}}>
              <EmojiIcon emoji="🔑" size={22} style={styles.tabIcon} />
              <Text
                style={[
                  styles.tabText,
                  {color: colors.secondaryLabel},
                  activeTab === 'keys' && {color: colors.securityTint},
                ]}>
                {t('tabs.keys')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.tab}
              onPress={() => setActiveTab('encrypt')}
              accessibilityRole="tab"
              accessibilityLabel={t('tabs.encryptA11y')}
              accessibilityState={{selected: activeTab === 'encrypt'}}>
              <EmojiIcon emoji="🔒" size={22} style={styles.tabIcon} />
              <Text
                style={[
                  styles.tabText,
                  {color: colors.secondaryLabel},
                  activeTab === 'encrypt' && {color: colors.securityTint},
                ]}>
                {t('tabs.encrypt')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaView>

      <LockScreen visible={locked} onUnlock={handleUnlock} />
    </>
  );
}

function App() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    lineHeight: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 49,
    paddingVertical: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default App;
