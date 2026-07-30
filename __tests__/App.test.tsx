/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../App';
import {OnboardingTutorial} from '../src/components/OnboardingTutorial';
import {initI18n} from '../src/i18n';

jest.mock('../src/services/biometrics', () => ({
  authenticateWithBiometrics: jest.fn(async () => true),
  resolveAppLockState: jest.fn(async () => ({
    enabled: false,
    available: false,
  })),
  getBiometricUnlockLabel: jest.fn(async () => 'Face ID'),
  getBiometricLockSettingLabel: jest.fn(() => 'Face ID / Touch ID lock'),
  enableBiometricLockWithVerification: jest.fn(),
  isBiometricAvailable: jest.fn(async () => false),
}));

jest.mock('../src/services/keyStorage', () => {
  class KeyStorageError extends Error {}
  return {
    KeyStorageError,
    loadKeys: jest.fn(async () => []),
    addKey: jest.fn(),
    deleteKey: jest.fn(),
    findDuplicateKey: jest.fn(async () => null),
    namesMatch: jest.fn(),
  };
});

jest.mock('lottie-react-native', () => 'LottieView');

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});

test('tutorial shows welcome step and completes', async () => {
  await initI18n('en');
  const onComplete = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <OnboardingTutorial visible onComplete={onComplete} />,
    );
  });

  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Encrypt messages together');
  expect(json).toContain('Next');

  const pressables = tree.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
  const skip = pressables.find(
    node => node.props.accessibilityLabel === 'Skip tutorial',
  );
  expect(skip).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    skip!.props.onPress();
  });
  expect(onComplete).toHaveBeenCalled();
});
