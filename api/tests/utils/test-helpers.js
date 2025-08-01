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
  TESTUSER1: {
    username: 'testuser1',
    password: 'password123',
    id: 2,
    superadmin: false
  },
  TESTUSER2: {
    username: 'testuser2',
    password: 'password123',
    id: 3,
    superadmin: false
  },
  REGULARUSER: {
    username: 'regularuser',
    password: 'password123',
    id: 4,
    superadmin: false
  }
};

/**
 * Test workspace data
 */
const TEST_WORKSPACES = {
  WORKSPACE1: {
    id: 1,
    name: 'Test Workspace 1',
    note: 'Main testing workspace',
    currency_symbol: '$'
  },
  WORKSPACE2: {
    id: 2,
    name: 'Test Workspace 2',
    note: 'Secondary testing workspace',
    currency_symbol: '€'
  },
  SEARCH_WORKSPACE: {
    id: 3,
    name: 'Search Test Workspace',
    note: 'Workspace for search testing',
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

  const response = await request(app)
    .post('/api/users/login')
    .send({
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
  tokens.testuser1 = await loginUser(TEST_USERS.TESTUSER1);
  tokens.testuser2 = await loginUser(TEST_USERS.TESTUSER2);
  tokens.regularuser = await loginUser(TEST_USERS.REGULARUSER);

  return tokens;
}

/**
 * Get tokens from cache or initialize if empty
 * This is more efficient than always calling initializeTokenCache
 * @returns {Promise<Object>} Object with all cached tokens
 */
async function getOrInitializeTokens() {
  // Check if we have tokens in cache
  if (tokenCache.has('superadmin') &&
    tokenCache.has('testuser1') &&
    tokenCache.has('testuser2') &&
    tokenCache.has('regularuser')) {
    return {
      superadmin: tokenCache.get('superadmin'),
      testuser1: tokenCache.get('testuser1'),
      testuser2: tokenCache.get('testuser2'),
      regularuser: tokenCache.get('regularuser')
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
  // NOTE: We don't clear token cache here because JWT tokens remain valid
  // even after database reset, since they're signed with the JWT secret
  // and don't depend on database state

  try {
    // Temporarily disable foreign key checks to handle circular references
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Clear all data but keep schema - order matters due to foreign key constraints
    const tables = [
      'transaction',    // references account, category
      'total',          // references account
      'category',       // references category (self), workspace  
      'account',        // references workspace
      'workspace_user', // references workspace, user
      'workspace',      // referenced by account, category, workspace_user
      'user'           // referenced by workspace_user
    ];

    // Delete in dependency order
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`);
      await db.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }

    // Re-enable foreign key checks
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    // Make sure to re-enable foreign key checks even if there's an error
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    throw error;
  }

  // Re-insert test data
  const fs = require('fs').promises;
  const path = require('path');
  const schemaPath = path.join(__dirname, '../../db/test_schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');

  // Extract and execute only INSERT statements - parse the same way as global setup
  const statements = schema
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  const insertStatements = statements
    .filter(stmt => stmt.toUpperCase().startsWith('INSERT'));

  for (const statement of insertStatements) {
    await db.execute(statement);
  }

  // Wait a bit to ensure all operations are committed
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Create a test user
 * @param {Object} userData - User data
 * @param {string} token - Admin token
 * @returns {Promise<Object>} Created user
 */
async function createTestUser(userData, token) {
  const response = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send(userData);

  return response.body;
}

/**
 * Create a test workspace
 * @param {Object} workspaceData - Workspace data
 * @param {string} token - Admin token
 * @returns {Promise<Object>} Created workspace
 */
async function createTestWorkspace(workspaceData, token) {
  const response = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send(workspaceData);

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
 * Validate workspace object structure
 * @param {Object} workspace - Workspace object
 */
function validateWorkspaceObject(workspace) {
  expect(workspace).toHaveProperty('id');
  expect(workspace).toHaveProperty('name');
  expect(workspace).toHaveProperty('note');
  expect(workspace).toHaveProperty('currency_symbol');
  expect(workspace).toHaveProperty('created_at');

  expect(typeof workspace.id).toBe('number');
  expect(typeof workspace.name).toBe('string');
  expect(typeof workspace.currency_symbol).toBe('string');
}

/**
 * Generate random test data
 */
function generateRandomData() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    password: 'password123',
    workspaceName: `Test Workspace ${timestamp}`,
    accountName: `Test Account ${timestamp}`,
    categoryName: `Test Category ${timestamp}`
  };
}

module.exports = {
  TEST_USERS,
  TEST_WORKSPACES,
  loginUser,
  clearTokenCache,
  initializeTokenCache,
  getOrInitializeTokens,
  authenticatedRequest,
  resetDatabase,
  createTestUser,
  createTestWorkspace,
  validateApiResponse,
  validateUserObject,
  validateWorkspaceObject,
  generateRandomData,
  app,
  db
};
