module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/node/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/main/**/*.js',
    '!src/main/preload.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
