jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (key, value) => {
        store[key] = value;
      }),
      getItem: jest.fn(async key => store[key] ?? null),
      removeItem: jest.fn(async key => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    },
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn(async () => ''),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {
    trigger: jest.fn(),
  },
}));

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(async () => ({available: false})),
    simplePrompt: jest.fn(async () => ({success: true})),
  })),
}));

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, {testID: 'mock-qr-code'}),
  };
});

jest.mock('react-native-camera-kit', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    Camera: () => React.createElement(View, {testID: 'mock-camera'}),
  };
});

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [{languageCode: 'en', countryCode: 'US'}]),
}));

const {initI18n} = require('./src/i18n');

beforeAll(async () => {
  await initI18n('en');
});
