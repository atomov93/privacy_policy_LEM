module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.lottie$': '<rootDir>/__mocks__/lottieMock.js',
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
};
