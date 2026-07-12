import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export function triggerLightHaptic(): void {
  ReactNativeHapticFeedback.trigger('impactLight', options);
}
