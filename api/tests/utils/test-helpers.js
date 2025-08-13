/**
 * Test Utilities
 *
 * Common utilities and helpers for testing API endpoints.
 *
 * Token Caching Optimization:
 * - The loginUser function now caches JWT tokens to avoid expensive bcrypt operations
 * - Use initializeTokenCache() at the beginning of test suites for best performance
 * - Cache is automatically cleared when resetDatabase() is called
 * - This reduces test execution time significantly by avoiding repeated login calls
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db');
const { executeScript } = require('./sql-utils');

/**
 * Test user credentials
 */
const TEST_USERS = {
  SUPERADMIN: {
    username: 'superadmin',
    password: 'password123',
    id: 1,
    superadmin: true
  },
  ADMIN: {
    username: 'admin',
    password: 'password123',
    id: 2,
    superadmin: false
  },
  COLLABORATOR: {
    username: 'collaborator',
    password: 'password123',
    id: 3,
    superadmin: false
  },
  VIEWER: {
    username: 'viewer',
    password: 'password123',
    id: 4,
    superadmin: false
  },
  NOACCESS: {
    username: 'noaccess',
    password: 'password123',
    id: 5,
    superadmin: false
  },
  REGULARUSER: {
    username: 'viewer',
    password: 'password123',
    id: 4,
    superadmin: false
  }
};

/**
 * Test book data
 */
const TEST_BOOKS = {
  BOOK1: {
    id: 1,
    name: 'Test Book 1',
    note: 'Main testing book',
    currency_symbol: '$'
  },
  BOOK2: {
    id: 2,
    name: 'Test Book 2',
    note: 'Secondary testing book',
    currency_symbol: '€'
  },
  SEARCH_BOOK: {
    id: 3,
    name: 'Search Test Book',
    note: 'Book for search testing',
    currency_symbol: '£'
  }
};

/**
 * Token cache to avoid repeated login calls
 * Cache is reset when database is reset
 */
let tokenCache = new Map();

/**
 * Login a user and return the JWT token (with caching)
 * @param {Object} user - User credentials
 * @returns {Promise<string>} JWT token
 */
async function loginUser(user = TEST_USERS.SUPERADMIN) {
  const cacheKey = user.username;

  // Return cached token if available
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  const response = await request(app).post('/api/users/login').send({
    username: user.username,
    password: user.password
  });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${user.username}: ${response.text}`);
  }

  const token = response.body.token;

  // Cache the token
  tokenCache.set(cacheKey, token);

  return token;
}

/**
 * Clear the token cache (called when database is reset)
 */
function clearTokenCache() {
  tokenCache.clear();
}

/**
 * Pre-populate token cache for common test users
 * This can be called at the beginning of test suites to reduce login calls
 * @returns {Promise<Object>} Object with all cached tokens
 */
async function initializeTokenCache() {
  const tokens = {};

  // Get tokens for all common test users
  tokens.superadmin = await loginUser(TEST_USERS.SUPERADMIN);
  tokens.admin = await loginUser(TEST_USERS.ADMIN);
  tokens.collaborator = await loginUser(TEST_USERS.COLLABORATOR);
  tokens.viewer = await loginUser(TEST_USERS.VIEWER);
  tokens.noaccess = await loginUser(TEST_USERS.NOACCESS);

  return tokens;
}

/**
 * Get tokens from cache or initialize if empty
 * This is more efficient than always calling initializeTokenCache
 * @returns {Promise<Object>} Object with all cached tokens
 */
async function getOrInitializeTokens() {
  // Check if we have tokens in cache
  if (
    tokenCache.has('superadmin') &&
    tokenCache.has('admin') &&
    tokenCache.has('collaborator') &&
    tokenCache.has('viewer') &&
    tokenCache.has('noaccess')
  ) {
    return {
      superadmin: tokenCache.get('superadmin'),
      admin: tokenCache.get('admin'),
      collaborator: tokenCache.get('collaborator'),
      viewer: tokenCache.get('viewer'),
      noaccess: tokenCache.get('noaccess')
    };
  }

  // Cache is empty, initialize it
  return await initializeTokenCache();
}

/**
 * Create a supertest request with authentication
 * @param {string} token - JWT token
 * @returns {Object} Supertest agent with auth header
 */
function authenticatedRequest(token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
}

/**
 * Reset database to clean state between tests
 */
async function resetDatabase() {
  try {
    // Use a clean_up.sql script instead of manual DELETE statements
    const fs = require('fs').promises;
    const path = require('path');

    // Read and execute the cleanup script
    const cleanupPath = path.join(__dirname, '../../db/cleanup.sql');
    const cleanupSql = await fs.readFile(cleanupPath, 'utf8');

    // Execute the cleanup script using shared utility
    await executeScript(db, cleanupSql, 'cleanup', true);

    // Re-insert test data
    const seedsPath = path.join(__dirname, '../../db/test_seeds.sql');
    const seedsSql = await fs.readFile(seedsPath, 'utf8');

    // Execute the seeds script using shared utility
    await executeScript(db, seedsSql, 'seed', true);
  } catch (error) {
    console.error('Error during database reset:', error);
    throw error;
  }

  // Wait a bit to ensure all operations are committed
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Create a test user
 * @param {Object} userData - User data
 * @param {string} token - Admin token
 * @returns {Promise<Object>
 */
async function createTestUser(userData, token) {
  const response = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send(userData);

  return response.body;
}

/**
 * Validate common API response structure
 * @param {Object} response - Supertest response
 * @param {number} expectedStatus - Expected HTTP status
 */
function validateApiResponse(response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);

  // 204 No Content responses don't have a content-type header or body
  if (expectedStatus !== 204) {
    expect(response.headers['content-type']).toMatch(/json/);
  }
}

/**
 * Validate user object structure
 * @param {Object} user - User object
 */
function validateUserObject(user) {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('created_at');
  expect(user).toHaveProperty('superadmin');
  expect(user).not.toHaveProperty('password_hash');

  expect(typeof user.id).toBe('number');
  expect(typeof user.username).toBe('string');
  expect(typeof user.superadmin).toBe('boolean');
}

/**
 * Validate book object structure
 * @param {Object} book - Book object
 */
function validateBookObject(book) {
  expect(book).toHaveProperty('id');
  expect(book).toHaveProperty('name');
  expect(book).toHaveProperty('note');
  expect(book).toHaveProperty('currency_symbol');
  expect(book).toHaveProperty('created_at');

  expect(typeof book.id).toBe('number');
  expect(typeof book.name).toBe('string');
  expect(typeof book.currency_symbol).toBe('string');
}

/**
 * Generate random test data
 */
function generateRandomData() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    password: 'password123',
    bookName: `Test Book ${timestamp}`,
    accountName: `Test Account ${timestamp}`,
    categoryName: `Test Category ${timestamp}`
  };
}

// Add custom Jest matchers
beforeAll(() => {
  // Custom matcher to check if a string is a valid JWT token
  expect.extend({
    toHaveValidJWT(received) {
      if (typeof received !== 'string') {
        return {
          message: () => `Expected ${received} to be a string (JWT token)`,
          pass: false
        };
      }

      // JWT tokens have 3 parts separated by dots
      const parts = received.split('.');
      const pass = parts.length === 3;

      return {
        message: () =>
          pass
            ? `Expected ${received} not to be a valid JWT token`
            : `Expected ${received} to be a valid JWT token (should have 3 parts separated by dots)`,
        pass
      };
    }
  });
});

module.exports = {
  // Test data
  TEST_USERS,
  TEST_BOOKS,

  // Auth utilities
  loginUser,
  clearTokenCache,
  initializeTokenCache,
  getOrInitializeTokens,
  authenticatedRequest,

  // Database utilities
  resetDatabase,

  // Test helpers
  createTestUser,
  validateApiResponse,
  validateUserObject,
  validateBookObject,
  generateRandomData,

  // Core app components
  app,
  db
};
