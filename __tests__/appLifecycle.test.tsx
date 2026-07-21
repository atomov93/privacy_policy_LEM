import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

const mockIsBiometricLockEnabled = jest.fn();
const mockAuthenticateWithBiometrics = jest.fn();

jest.mock('../src/services/settingsStorage', () => ({
  getLanguage: jest.fn(async () => 'en'),
  isBiometricLockEnabled: mockIsBiometricLockEnabled,
  setBiometricLockEnabled: jest.fn(),
  setLanguage: jest.fn(),
}));
jest.mock('../src/services/biometrics', () => ({
  authenticateWithBiometrics: mockAuthenticateWithBiometrics,
  getBiometricLockSettingLabel: jest.fn(() => 'Biometric lock'),
  getBiometricUnlockLabel: jest.fn(async () => 'Biometrics'),
}));

import App from '../App';

type AppStateListener = (state: 'active' | 'background' | 'inactive') => void;

describe('background/foreground locking races', () => {
  let listener: AppStateListener;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBiometricLockEnabled.mockResolvedValue(true);
    mockAuthenticateWithBiometrics.mockResolvedValue(true);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, callback) => {
        listener = callback as AppStateListener;
        return { remove: jest.fn() };
      });
  });
  afterEach(() => jest.restoreAllMocks());

  it('coalesces rapid foreground events into one authentication prompt', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });
    mockAuthenticateWithBiometrics.mockClear();
    await ReactTestRenderer.act(async () => {
      listener('background');
      listener('active');
      listener('background');
      listener('active');
    });
    expect(mockAuthenticateWithBiometrics).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it.failing(
    'ignores a stale successful prompt after backgrounding again',
    async () => {
      let resolveAuthentication!: (success: boolean) => void;
      mockAuthenticateWithBiometrics.mockImplementationOnce(
        () =>
          new Promise<boolean>(resolve => {
            resolveAuthentication = resolve;
          }),
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(<App />);
      });
      await ReactTestRenderer.act(async () => listener('background'));
      await ReactTestRenderer.act(async () => resolveAuthentication(true));
      expect(
        renderer.root.findAll(
          node => node.props.accessibilityViewIsModal === true,
        ),
      ).toHaveLength(1);
    },
  );
});
