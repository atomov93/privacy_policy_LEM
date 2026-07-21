import {Platform} from 'react-native';

const mockIsSensorAvailable = jest.fn();
const mockSimplePrompt = jest.fn();

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  BiometryTypes: {FaceID: 'FaceID', TouchID: 'TouchID'},
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: mockIsSensorAvailable,
    simplePrompt: mockSimplePrompt,
  })),
}));

describe('biometric failures and sensor removal', () => {
  let isBiometricAvailable: typeof import('../src/services/biometrics').isBiometricAvailable;
  let authenticateWithBiometrics: typeof import('../src/services/biometrics').authenticateWithBiometrics;
  let authenticateToRevealSecret: typeof import('../src/services/biometrics').authenticateToRevealSecret;
  let enableBiometricLockWithVerification: typeof import('../src/services/biometrics').enableBiometricLockWithVerification;
  let getBiometricLockSettingLabel: typeof import('../src/services/biometrics').getBiometricLockSettingLabel;
  let getBiometricUnlockLabel: typeof import('../src/services/biometrics').getBiometricUnlockLabel;
  const originalOs = Platform.OS;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
    mockIsSensorAvailable.mockResolvedValue({available: true});
    mockSimplePrompt.mockResolvedValue({success: true});
    // Re-bind service module to this file's biometrics mock instance.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {initI18n} = require('../src/i18n');
    await initI18n('en');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const biometrics = require('../src/services/biometrics');
    isBiometricAvailable = biometrics.isBiometricAvailable;
    authenticateWithBiometrics = biometrics.authenticateWithBiometrics;
    authenticateToRevealSecret = biometrics.authenticateToRevealSecret;
    enableBiometricLockWithVerification =
      biometrics.enableBiometricLockWithVerification;
    getBiometricLockSettingLabel = biometrics.getBiometricLockSettingLabel;
    getBiometricUnlockLabel = biometrics.getBiometricUnlockLabel;
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it('reports unavailable when sensor discovery rejects', async () => {
    mockIsSensorAvailable.mockRejectedValueOnce(new Error('sensor failure'));
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });

  it('remains locked when the prompt rejects or is cancelled', async () => {
    mockSimplePrompt.mockRejectedValueOnce(new Error('prompt interrupted'));
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
    mockSimplePrompt.mockResolvedValueOnce({success: false});
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
  });

  it('fails closed when a previously available sensor is removed', async () => {
    mockIsSensorAvailable.mockResolvedValue({available: true});
    await expect(isBiometricAvailable()).resolves.toBe(true);
    mockIsSensorAvailable.mockResolvedValue({available: false});
    mockSimplePrompt.mockClear();
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
    expect(mockSimplePrompt).not.toHaveBeenCalled();
  });

  it('does not reveal a secret when authentication is unavailable', async () => {
    mockIsSensorAvailable.mockResolvedValue({available: false});
    await expect(authenticateToRevealSecret()).resolves.toBe(false);
  });

  it('requires a successful prompt before enabling the lock', async () => {
    mockIsSensorAvailable.mockResolvedValue({available: true});
    mockSimplePrompt.mockResolvedValue({success: true});
    await expect(enableBiometricLockWithVerification()).resolves.toBe(true);
    mockIsSensorAvailable.mockResolvedValue({available: false});
    await expect(enableBiometricLockWithVerification()).resolves.toBe(false);
  });

  it('reveals secrets only after a successful prompt', async () => {
    mockIsSensorAvailable.mockResolvedValue({available: true});
    mockSimplePrompt.mockResolvedValue({success: true});
    await expect(authenticateToRevealSecret()).resolves.toBe(true);
    mockSimplePrompt.mockResolvedValue({success: false});
    await expect(authenticateToRevealSecret()).resolves.toBe(false);
  });

  it('uses platform-specific lock setting labels', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    expect(getBiometricLockSettingLabel()).toBe('Screen lock');

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    // Re-require so the service sees the updated Platform.OS for label helpers
    // that read Platform at call time (no module re-init needed for these).
    expect(getBiometricLockSettingLabel()).toBe('Face ID / Touch ID lock');
  });

  it('maps iOS biometry types to unlock labels', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });
    await expect(getBiometricUnlockLabel()).resolves.toBe('Face ID');

    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    });
    await expect(getBiometricUnlockLabel()).resolves.toBe('Touch ID');

    mockIsSensorAvailable.mockResolvedValue({available: false});
    await expect(getBiometricUnlockLabel()).resolves.toBe(
      'Face ID or Touch ID',
    );

    mockIsSensorAvailable.mockRejectedValueOnce(new Error('unavailable'));
    await expect(getBiometricUnlockLabel()).resolves.toBe(
      'Face ID or Touch ID',
    );
  });

  it('uses screen lock unlock label on Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });
    await expect(getBiometricUnlockLabel()).resolves.toBe('Screen lock');
  });
});
