module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.lottie$': '<rootDir>/__mocks__/lottieMock.js',
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    '!src/services/haptics.ts',
    '!src/services/cameraPermission.ts',
  ],
  coverageThreshold: {
    './src/services/cryptoService.ts': {
      lines: 80,
    },
    './src/services/keyStorage.ts': {
      lines: 80,
    },
    './src/services/qrPayload.ts': {
      lines: 70,
    },
    './src/services/biometrics.ts': {
      lines: 55,
    },
  },
};
