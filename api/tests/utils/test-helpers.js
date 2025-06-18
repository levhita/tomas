/**
 * Test Utilities
 * 
 * Common utilities and helpers for testing API endpoints.
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
    description: 'Main testing workspace',
    currency_symbol: '$'
  },
  WORKSPACE2: {
    id: 2,
    name: 'Test Workspace 2',
    description: 'Secondary testing workspace',
    currency_symbol: '€'
  },
  SEARCH_WORKSPACE: {
    id: 3,
    name: 'Search Test Workspace',
    description: 'Workspace for search testing',
    currency_symbol: '£'
  }
};

/**
 * Login a user and return the JWT token
 * @param {Object} user - User credentials
 * @returns {Promise<string>} JWT token
 */
async function loginUser(user = TEST_USERS.SUPERADMIN) {
  const response = await request(app)
    .post('/api/users/login')
    .send({
      username: user.username,
      password: user.password
    });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${user.username}: ${response.text}`);
  }

  return response.body.token;
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
  // Clear all data but keep schema
  const tables = ['transaction', 'total', 'category', 'account', 'workspace_user', 'workspace', 'user'];

  // Delete in dependency order
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table}`);
    await db.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  }

  // Re-insert test data
  const fs = require('fs').promises;
  const path = require('path');
  const schemaPath = path.join(__dirname, '../../db/test_schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');

  // Extract and execute only INSERT statements
  const insertStatements = schema
    .split(';')
    .filter(stmt => stmt.trim().toUpperCase().startsWith('INSERT'))
    .filter(stmt => stmt.trim().length > 0);

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
  expect(workspace).toHaveProperty('description');
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
