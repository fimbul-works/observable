export default {
  testMatch: ['**/src/**/*.test.ts'],
  transform: {},
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transformIgnorePatterns: ['node_modules/(?!(ts-jest|jest-runtime)/)'],
};
