import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

import i18n from '../i18n';

type CameraPermissionStatus = 'granted' | 'denied';

const {RNCameraKitModule} = NativeModules;

export async function ensureCameraPermission(): Promise<CameraPermissionStatus> {
  if (Platform.OS === 'android') {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (alreadyGranted) {
      return 'granted';
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: i18n.t('camera.title'),
        message: i18n.t('camera.message'),
        buttonPositive: i18n.t('camera.allow'),
        buttonNegative: i18n.t('camera.deny'),
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
  }

  if (!RNCameraKitModule?.checkDeviceCameraAuthorizationStatus) {
    return 'granted';
  }

  const status = await RNCameraKitModule.checkDeviceCameraAuthorizationStatus();
  if (status === true) {
    return 'granted';
  }

  if (status === -1 && RNCameraKitModule.requestDeviceCameraAuthorization) {
    const granted = await RNCameraKitModule.requestDeviceCameraAuthorization();
    return granted ? 'granted' : 'denied';
  }

  return 'denied';
}
