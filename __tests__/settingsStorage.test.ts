import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getLanguage,
  hasSeenTutorial,
  isBiometricLockEnabled,
  resetTutorial,
  setBiometricLockEnabled,
  setHasSeenTutorial,
  setLanguage,
} from '../src/services/settingsStorage';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('settingsStorage', () => {
  beforeEach(async () => {
    await storage.clear();
    jest.clearAllMocks();
  });

  it('defaults biometric lock to enabled when unset', async () => {
    await expect(isBiometricLockEnabled()).resolves.toBe(true);
  });

  it('persists biometric lock preference', async () => {
    await setBiometricLockEnabled(false);
    await expect(isBiometricLockEnabled()).resolves.toBe(false);
    await setBiometricLockEnabled(true);
    await expect(isBiometricLockEnabled()).resolves.toBe(true);
  });

  it('persists language preference', async () => {
    await expect(getLanguage()).resolves.toBeNull();
    await setLanguage('de');
    await expect(getLanguage()).resolves.toBe('de');
  });

  it('defaults tutorial as unseen when unset', async () => {
    await expect(hasSeenTutorial()).resolves.toBe(false);
  });

  it('persists and resets tutorial seen flag', async () => {
    await setHasSeenTutorial(true);
    await expect(hasSeenTutorial()).resolves.toBe(true);
    await resetTutorial();
    await expect(hasSeenTutorial()).resolves.toBe(false);
  });
});
