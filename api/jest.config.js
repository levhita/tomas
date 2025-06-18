/**
 * Jest Configuration for API Testing
 * 
 * This configuration sets up Jest for comprehensive API testing with:
 * - Real database integration using MySQL
 * - Global setup and teardown for database management
 * - Environment variables for test isolation
 * - Extended timeout for database operations
 */

module.exports = {
  // Test environment setup
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files to run before tests
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-setup.js'],

  // Test timeout (increased for database operations)
  testTimeout: 10000,

  // Force single worker for Node 16 compatibility
  maxWorkers: 1,

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/public/**',
    '!src/views/**',
    '!src/db.js',
    '!src/app.js',
    '!bin/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Force exit to handle open handles (database connections)
  forceExit: true,

  // Exit process when tests complete
  testRunner: 'jest-circus/runner',

  // Workaround for CI environments
  watchman: false
};
