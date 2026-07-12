import {Platform} from 'react-native';
import ReactNativeBiometrics, {
  BiometryTypes,
} from 'react-native-biometrics';

import i18n from '../i18n';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: Platform.OS === 'android',
});

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const {available} = await rnBiometrics.isSensorAvailable();
    return available;
  } catch {
    return false;
  }
}

export function getBiometricLockSettingLabel(): string {
  return Platform.OS === 'android'
    ? i18n.t('biometric.screenLockSetting')
    : i18n.t('biometric.faceIdTouchIdLock');
}

export async function getBiometricUnlockLabel(): Promise<string> {
  if (Platform.OS === 'android') {
    return i18n.t('biometric.screenLock');
  }

  try {
    const {available, biometryType} = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return i18n.t('biometric.faceIdOrTouchId');
    }

    if (biometryType === BiometryTypes.FaceID) {
      return i18n.t('biometric.faceId');
    }
    if (biometryType === BiometryTypes.TouchID) {
      return i18n.t('biometric.touchId');
    }
    return i18n.t('biometric.faceIdOrTouchId');
  } catch {
    return i18n.t('biometric.faceIdOrTouchId');
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return true;
    }

    const {success} = await rnBiometrics.simplePrompt({
      promptMessage: i18n.t('biometric.unlockApp'),
      cancelButtonText: i18n.t('common.cancel'),
      fallbackPromptMessage:
        Platform.OS === 'android'
          ? i18n.t('biometric.useScreenLock')
          : i18n.t('biometric.usePasscode'),
    });
    return success;
  } catch {
    return false;
  }
}

export async function authenticateToRevealSecret(): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return true;
    }

    const {success} = await rnBiometrics.simplePrompt({
      promptMessage: i18n.t('biometric.revealSecret'),
      cancelButtonText: i18n.t('common.cancel'),
      fallbackPromptMessage:
        Platform.OS === 'android'
          ? i18n.t('biometric.useScreenLock')
          : i18n.t('biometric.usePasscode'),
    });
    return success;
  } catch {
    return false;
  }
}
