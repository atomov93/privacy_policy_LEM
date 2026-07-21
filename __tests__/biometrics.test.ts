const mockIsSensorAvailable = jest.fn();
const mockSimplePrompt = jest.fn();

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  BiometryTypes: { FaceID: 'FaceID', TouchID: 'TouchID' },
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: mockIsSensorAvailable,
    simplePrompt: mockSimplePrompt,
  })),
}));

import {
  authenticateToRevealSecret,
  authenticateWithBiometrics,
  isBiometricAvailable,
} from '../src/services/biometrics';

describe('biometric failures and sensor removal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSensorAvailable.mockResolvedValue({ available: true });
    mockSimplePrompt.mockResolvedValue({ success: true });
  });

  it('reports unavailable when sensor discovery rejects', async () => {
    mockIsSensorAvailable.mockRejectedValueOnce(new Error('sensor failure'));
    await expect(isBiometricAvailable()).resolves.toBe(false);
  });

  it('remains locked when the prompt rejects or is cancelled', async () => {
    mockSimplePrompt.mockRejectedValueOnce(new Error('prompt interrupted'));
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
    mockSimplePrompt.mockResolvedValueOnce({ success: false });
    await expect(authenticateWithBiometrics()).resolves.toBe(false);
  });

  it.failing(
    'fails closed when a previously available sensor is removed',
    async () => {
      mockIsSensorAvailable
        .mockResolvedValueOnce({ available: true })
        .mockResolvedValueOnce({ available: false });
      await expect(isBiometricAvailable()).resolves.toBe(true);
      await expect(authenticateWithBiometrics()).resolves.toBe(false);
      expect(mockSimplePrompt).not.toHaveBeenCalled();
    },
  );

  it.failing(
    'does not reveal a secret when authentication is unavailable',
    async () => {
      mockIsSensorAvailable.mockResolvedValueOnce({ available: false });
      await expect(authenticateToRevealSecret()).resolves.toBe(false);
    },
  );
});
