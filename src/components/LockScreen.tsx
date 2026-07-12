import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';

import {getBiometricUnlockLabel} from '../services/biometrics';
import {LockAnimation} from './LockAnimation';
import {Button, useTheme} from './ui';

interface LockScreenProps {
  visible: boolean;
  onUnlock: () => void;
}

export function LockScreen({visible, onUnlock}: LockScreenProps) {
  const {colors, isDark} = useTheme();
  const {t} = useTranslation();
  const [unlockLabel, setUnlockLabel] = useState(
    Platform.OS === 'android'
      ? t('biometric.screenLock')
      : t('biometric.faceIdOrTouchId'),
  );
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      setUnlockLabel(t('biometric.screenLock'));
      return;
    }

    getBiometricUnlockLabel().then(setUnlockLabel);
  }, [t]);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(24);
      buttonScale.setValue(1);
      return;
    }

    const entrance = Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 360,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 360,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    entrance.start(({finished}) => {
      if (finished) {
        pulse.start();
      }
    });

    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [
    visible,
    overlayOpacity,
    contentOpacity,
    contentTranslateY,
    buttonScale,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onUnlock}
      accessibilityViewIsModal>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            opacity: overlayOpacity,
          },
        ]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: contentOpacity,
                transform: [{translateY: contentTranslateY}],
              },
            ]}>
            <LockAnimation />
            <Text style={[styles.title, {color: colors.label}]}>
              {t('lock.locked')}
            </Text>
            <Text style={[styles.subtitle, {color: colors.secondaryLabel}]}>
              {t('lock.authenticateWith', {method: unlockLabel})}
            </Text>
            <Animated.View
              style={[styles.buttonWrap, {transform: [{scale: buttonScale}]}]}>
              <Button
                title={t('lock.unlock')}
                onPress={onUnlock}
                accessibilityLabel={t('lock.unlockWith', {
                  method: unlockLabel,
                })}
              />
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonWrap: {
    alignSelf: 'stretch',
  },
});
