import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_LOCK_KEY = '@lets_encrypt_app/biometric_lock_enabled';
const LANGUAGE_KEY = '@lets_encrypt_app/language';
const TUTORIAL_SEEN_KEY = '@lets_encrypt_app/tutorial_seen';

export async function isBiometricLockEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
  if (raw === null) {
    return true;
  }
  return raw === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, String(enabled));
}

export async function getLanguage(): Promise<string | null> {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}

export async function setLanguage(language: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function hasSeenTutorial(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
  return raw === 'true';
}

export async function setHasSeenTutorial(seen: boolean): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, String(seen));
}

export async function resetTutorial(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'false');
}
