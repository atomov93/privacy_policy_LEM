import {Platform} from 'react-native';
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';

import i18n from '../i18n';
import {
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from './settingsStorage';

/**
 * Android: allow PIN/pattern/password as device credentials.
 * iOS: biometrics only — DeviceOwnerAuthentication reports "available" on
 * Simulator even without a passcode, which traps the unlock UI in a passcode loop.
 */
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

/**
 * Returns whether app lock can actually be enforced on this device.
 * If the user previously enabled lock but the device has no screen lock /
 * biometrics, the preference is turned off so the unlock UI cannot trap them.
 */
export async function resolveAppLockState(): Promise<{
  available: boolean;
  enabled: boolean;
}> {
  const available = await isBiometricAvailable();
  let enabled = await isBiometricLockEnabled();
  if (!available && enabled) {
    await setBiometricLockEnabled(false);
    enabled = false;
  }
  return {available, enabled};
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
      return false;
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
      // Nothing to authenticate with — do not block secret reveal forever.
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

/** Enable lock only after availability + a successful authentication. */
export async function enableBiometricLockWithVerification(): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) {
    return false;
  }
  return authenticateWithBiometrics();
}
