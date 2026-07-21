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
  BiometryTypes: {FaceID: 'FaceID', TouchID: 'TouchID'},
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn(async () => ({available: false})),
    simplePrompt: jest.fn(async () => ({success: true})),
  })),
}));

const keychainStore = {};
jest.mock('react-native-keychain', () => ({
  __esModule: true,
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  setGenericPassword: jest.fn(async (username, password, options) => {
    keychainStore[options?.service ?? 'default'] = {username, password};
    return true;
  }),
  getGenericPassword: jest.fn(async options => {
    const entry = keychainStore[options?.service ?? 'default'];
    return entry ?? false;
  }),
  resetGenericPassword: jest.fn(async options => {
    delete keychainStore[options?.service ?? 'default'];
    return true;
  }),
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

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  writeFile: jest.fn(async () => undefined),
  readFile: jest.fn(async () => ''),
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(async () => ({success: true})),
  },
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(async () => []),
  keepLocalCopy: jest.fn(async () => []),
  isErrorWithCode: jest.fn(() => false),
  types: {},
}));

const {initI18n} = require('./src/i18n');

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  Object.keys(keychainStore).forEach(key => delete keychainStore[key]);
});
