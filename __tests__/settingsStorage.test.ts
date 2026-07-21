import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getLanguage,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
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
});
