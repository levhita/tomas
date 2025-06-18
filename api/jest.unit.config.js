/**
 * Jest Configuration for Unit Tests Only
 * 
 * This configuration runs unit tests without database setup
 */

module.exports = {
  // Test environment setup
  testEnvironment: 'node',

  // Test file patterns - only unit tests
  testMatch: [
    '**/tests/unit/**/*.test.js'
  ],

  // No global setup for unit tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-setup.js'],

  // Test timeout
  testTimeout: 5000,

  // Force single worker for Node 16 compatibility
  maxWorkers: 1,

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/public/**',
    '!src/views/**',
    '!bin/**'
  ],

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true
};
