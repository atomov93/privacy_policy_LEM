import React, {Suspense, useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Camera} from 'react-native-camera-kit';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ensureCameraPermission} from '../services/cameraPermission';
import {getFingerprint} from '../services/cryptoService';
import {
  decodeKeyQrPayload,
  isEncryptedQrPayload,
  keyFromQrPayload,
  resetQrScanDebounce,
  shouldProcessQrScan,
} from '../services/qrPayload';
import {
  addKey,
  findDuplicateKey,
  namesMatch,
} from '../services/keyStorage';
import {triggerLightHaptic} from '../services/haptics';
import {MAX_KEY_NAME_LENGTH} from '../services/limits';
import {SavedKey} from '../types';
import {Button, InputField, MIN_TOUCH_TARGET} from './ui';

interface QRScanModalProps {
  visible: boolean;
  onClose: () => void;
  onKeyImported: (keys: SavedKey[]) => void;
}

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.55)';
const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;
const SCAN_THROTTLE_MS = 500;

function ScanCorner({
  style,
}: {
  style: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
  };
}) {
  return (
    <View
      style={[
        styles.corner,
        {
          width: CORNER_SIZE,
          height: CORNER_SIZE,
          borderColor: '#FFFFFF',
        },
        style,
      ]}
    />
  );
}

export function QRScanModal({
  visible,
  onClose,
  onKeyImported,
}: QRScanModalProps) {
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [pendingRaw, setPendingRaw] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Pick<
    SavedKey,
    'name' | 'secret'
  > | null>(null);
  const [keyName, setKeyName] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<
    'checking' | 'granted' | 'denied'
  >('checking');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const scanSize = useMemo(
    () => Math.min(screenWidth * 0.72, screenHeight * 0.38),
    [screenHeight, screenWidth],
  );

  const scanTop = useMemo(
    () => (screenHeight - scanSize) / 2 - 24,
    [scanSize, screenHeight],
  );
  const scanLeft = useMemo(
    () => (screenWidth - scanSize) / 2,
    [scanSize, screenWidth],
  );

  const resetScanState = useCallback(() => {
    setScanned(false);
    setPendingRaw(null);
    setPendingPayload(null);
    setKeyName('');
    setTransferPin('');
    setCameraError(null);
    resetQrScanDebounce();
  }, []);

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setPermissionStatus('checking');
      return;
    }

    let cancelled = false;

    ensureCameraPermission().then(status => {
      if (!cancelled) {
        setPermissionStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleQrDecoded = useCallback((raw: string) => {
    if (!shouldProcessQrScan(raw)) {
      setScanned(false);
      return;
    }
    if (!isEncryptedQrPayload(raw)) {
      Alert.alert(t('qrScan.invalidQr'), t('qrScan.legacyQrRejected'));
      setScanned(false);
      return;
    }
    setPendingRaw(raw);
  }, [t]);

  const handleUnlockPayload = useCallback(() => {
    if (!pendingRaw) {
      return;
    }
    const payload = decodeKeyQrPayload(pendingRaw, transferPin.trim());
    if (!payload) {
      Alert.alert(t('qrScan.invalidPin'), t('qrScan.invalidPinMessage'));
      return;
    }
    setPendingPayload(payload);
    setKeyName(payload.name);
  }, [pendingRaw, t, transferPin]);

  const persistImportedKey = useCallback(
    async (trimmedName: string, payload: Pick<SavedKey, 'name' | 'secret'>) => {
      const newKey = keyFromQrPayload({
        ...payload,
        name: trimmedName,
      });
      try {
        const updated = await addKey(newKey);
        triggerLightHaptic();
        onKeyImported(updated);
        Alert.alert(
          t('qrScan.keyImported'),
          t('qrScan.keyImportedMessage', {name: trimmedName}),
        );
        resetScanState();
        onClose();
      } catch {
        Alert.alert(t('keys.alertSaveFailed'), t('keys.alertSaveFailedMessage'));
      }
    },
    [onClose, onKeyImported, resetScanState, t],
  );

  const handleSaveKey = useCallback(async () => {
    if (!pendingPayload) {
      return;
    }

    const trimmedName = keyName.trim().slice(0, MAX_KEY_NAME_LENGTH);
    if (!trimmedName) {
      Alert.alert(
        t('keys.alertMissingName'),
        t('keys.alertMissingNameMessage'),
      );
      return;
    }

    const fingerprint = getFingerprint(pendingPayload.secret);
    const existing = await findDuplicateKey(trimmedName, fingerprint);
    if (existing) {
      Alert.alert(
        t('keys.alertReplaceTitle'),
        namesMatch(existing.name, trimmedName)
          ? t('keys.alertReplaceMessage', {name: trimmedName})
          : t('keys.alertReplaceFingerprintMessage', {
              existingName: existing.name,
              name: trimmedName,
            }),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('keys.replace'),
            style: 'destructive',
            onPress: () => {
              void persistImportedKey(trimmedName, pendingPayload);
            },
          },
        ],
      );
      return;
    }

    await persistImportedKey(trimmedName, pendingPayload);
  }, [keyName, pendingPayload, persistImportedKey, t]);

  const handleRescan = useCallback(() => {
    resetScanState();
  }, [resetScanState]);

  const handleReadCode = useCallback(
    (event: {nativeEvent: {codeStringValue?: string}}) => {
      if (scanned) {
        return;
      }

      const value = event.nativeEvent.codeStringValue;
      if (!value) {
        return;
      }

      setScanned(true);
      handleQrDecoded(value);
    },
    [scanned, handleQrDecoded],
  );

  const handleClose = useCallback(() => {
    resetScanState();
    setTorchOn(false);
    setCameraReady(false);
    onClose();
  }, [onClose, resetScanState]);

  const toggleTorch = useCallback(() => {
    setTorchOn(current => !current);
    triggerLightHaptic();
  }, []);

  const handleCameraError = useCallback(
    (event: {nativeEvent: {errorMessage?: string}}) => {
      const message =
        event.nativeEvent.errorMessage ?? t('qrScan.cameraError');
      setCameraError(message);
    },
    [t],
  );

  const canShowCamera =
    permissionStatus === 'granted' && cameraReady && !cameraError;

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      accessibilityViewIsModal
      onShow={() => {
        resetScanState();
        setTorchOn(false);
        setCameraError(null);
        setCameraReady(true);
      }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {canShowCamera ? (
          <Suspense
            fallback={
              <View style={styles.cameraFallback}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            }>
            <Camera
              style={StyleSheet.absoluteFill}
              scanBarcode={!scanned}
              showFrame={false}
              torchMode={torchOn ? 'on' : 'off'}
              resizeMode="cover"
              scanThrottleDelay={SCAN_THROTTLE_MS}
              allowedBarcodeTypes={['qr']}
              onReadCode={handleReadCode}
              onError={handleCameraError}
            />
          </Suspense>
        ) : (
          <View style={styles.cameraFallback}>
            {permissionStatus === 'checking' && (
              <>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.statusText}>{t('qrScan.checkingCamera')}</Text>
              </>
            )}
            {permissionStatus === 'denied' && (
              <>
                <Text style={styles.statusTitle}>{t('qrScan.cameraAccessNeeded')}</Text>
                <Text style={styles.statusText}>
                  {t('qrScan.cameraAccessMessage')}
                </Text>
              </>
            )}
            {permissionStatus === 'granted' && cameraError && (
              <>
                <Text style={styles.statusTitle}>{t('qrScan.cameraUnavailable')}</Text>
                <Text style={styles.statusText}>{cameraError}</Text>
              </>
            )}
            {permissionStatus === 'granted' && !cameraReady && !cameraError && (
              <>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <Text style={styles.statusText}>{t('qrScan.startingCamera')}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.overlay} pointerEvents="box-none">
          <View
            style={[
              styles.dim,
              {top: 0, left: 0, right: 0, height: Math.max(scanTop, insets.top + 56)},
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                top: scanTop + scanSize,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                top: scanTop,
                left: 0,
                width: scanLeft,
                height: scanSize,
              },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                top: scanTop,
                right: 0,
                width: scanLeft,
                height: scanSize,
              },
            ]}
          />

          <View
            style={[
              styles.scanWindow,
              {
                top: scanTop,
                left: scanLeft,
                width: scanSize,
                height: scanSize,
              },
            ]}
            pointerEvents="none">
            <ScanCorner
              style={{
                top: 0,
                left: 0,
                borderTopWidth: CORNER_WIDTH,
                borderLeftWidth: CORNER_WIDTH,
              }}
            />
            <ScanCorner
              style={{
                top: 0,
                right: 0,
                borderTopWidth: CORNER_WIDTH,
                borderRightWidth: CORNER_WIDTH,
              }}
            />
            <ScanCorner
              style={{
                bottom: 0,
                left: 0,
                borderBottomWidth: CORNER_WIDTH,
                borderLeftWidth: CORNER_WIDTH,
              }}
            />
            <ScanCorner
              style={{
                bottom: 0,
                right: 0,
                borderBottomWidth: CORNER_WIDTH,
                borderRightWidth: CORNER_WIDTH,
              }}
            />
          </View>

          <View
            style={[
              styles.topBar,
              {paddingTop: insets.top + 8, paddingHorizontal: 16},
            ]}>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('qrScan.closeScanner')}
              hitSlop={8}
              style={({pressed}) => [
                styles.topBarButton,
                {opacity: pressed ? 0.6 : 1},
              ]}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>

            <Text style={styles.title}>{t('qrScan.scanQr')}</Text>

            <Pressable
              onPress={toggleTorch}
              accessibilityRole="button"
              accessibilityLabel={
                torchOn ? t('qrScan.turnFlashOff') : t('qrScan.turnFlashOn')
              }
              hitSlop={8}
              style={({pressed}) => [
                styles.topBarButton,
                styles.torchButton,
                {opacity: pressed ? 0.6 : 1},
              ]}>
              <Text style={[styles.torchText, torchOn && styles.torchTextActive]}>
                {t('qrScan.flash')}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.footer,
              {paddingBottom: insets.bottom + 24, paddingHorizontal: 32},
            ]}>
            <Text style={styles.subtitle}>
              {pendingPayload
                ? t('qrScan.giveKeyName')
                : pendingRaw
                  ? t('qrScan.enterPin')
                  : t('qrScan.pointCamera')}
            </Text>
            {scanned && !pendingRaw && !pendingPayload && (
              <Text style={styles.processing}>{t('qrScan.processing')}</Text>
            )}
          </View>

          {pendingRaw && !pendingPayload && (
            <KeyboardAvoidingView
              style={styles.nameSheet}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}>
                <View
                  style={[
                    styles.nameSheetCard,
                    {
                      paddingBottom: insets.bottom + 16,
                      marginBottom: insets.bottom > 0 ? 0 : 16,
                    },
                  ]}>
                  <Text style={styles.nameSheetTitle}>{t('qrScan.enterPinTitle')}</Text>
                  <Text style={styles.nameSheetSubtitle}>
                    {t('qrScan.enterPinSubtitle')}
                  </Text>

                  <InputField
                    label={t('qrShare.transferPin')}
                    placeholder="123456"
                    value={transferPin}
                    onChangeText={setTransferPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    secureTextEntry
                    showToggleSecret
                    returnKeyType="done"
                    onSubmitEditing={handleUnlockPayload}
                  />

                  <Button
                    title={t('qrScan.unlockQr')}
                    onPress={handleUnlockPayload}
                    accessibilityLabel={t('qrScan.unlockQrA11y')}
                  />

                  <Pressable
                    onPress={handleRescan}
                    accessibilityRole="button"
                    accessibilityLabel={t('qrScan.scanDifferentA11y')}
                    style={({pressed}) => [
                      styles.rescanButton,
                      {opacity: pressed ? 0.6 : 1},
                    ]}>
                    <Text style={styles.rescanText}>{t('qrScan.scanAgain')}</Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          )}

          {pendingPayload && (
            <KeyboardAvoidingView
              style={styles.nameSheet}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}>
                <View
                  style={[
                    styles.nameSheetCard,
                    {
                      paddingBottom: insets.bottom + 16,
                      marginBottom: insets.bottom > 0 ? 0 : 16,
                    },
                  ]}>
                  <Text style={styles.nameSheetTitle}>{t('qrScan.nameThisKey')}</Text>
                  <Text style={styles.nameSheetSubtitle}>
                    {t('qrScan.nameThisKeySubtitle')}
                  </Text>

                  <InputField
                    label={t('keys.keyName')}
                    placeholder={t('keys.keyNamePlaceholder')}
                    value={keyName}
                    onChangeText={setKeyName}
                    autoCapitalize="words"
                    autoFocus
                    maxLength={MAX_KEY_NAME_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveKey}
                  />

                  <Button
                    title={t('common.saveKey')}
                    onPress={handleSaveKey}
                    accessibilityLabel={t('qrScan.saveImportedA11y')}
                  />

                  <Pressable
                    onPress={handleRescan}
                    accessibilityRole="button"
                    accessibilityLabel={t('qrScan.scanDifferentA11y')}
                    style={({pressed}) => [
                      styles.rescanButton,
                      {opacity: pressed ? 0.6 : 1},
                    ]}>
                    <Text style={styles.rescanText}>{t('qrScan.scanAgain')}</Text>
                  </Pressable>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dim: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  scanWindow: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    borderRadius: 2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  torchButton: {
    alignItems: 'flex-end',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  torchText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 17,
    fontWeight: '600',
  },
  torchTextActive: {
    color: '#FFD60A',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  processing: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  nameSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  nameSheetCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  nameSheetTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
  },
  nameSheetSubtitle: {
    color: 'rgba(60, 60, 67, 0.6)',
    fontSize: 15,
    lineHeight: 20,
    marginTop: -8,
  },
  rescanButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  rescanText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
