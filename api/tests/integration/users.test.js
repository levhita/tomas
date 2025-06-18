/**
 * User Management API Tests
 * 
 * Tests all user-related endpoints including authentication, CRUD operations,
 * and workspace management functionality.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  validateUserObject,
  generateRandomData,
  app
} = require('../utils/test-helpers');

describe('User Management API', () => {
  let superadminToken;
  let testUserToken;

  beforeAll(async () => {
    // Login once at the beginning - the global setup has already created test data
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
  });

  // Only reset between test suites if needed
  beforeEach(async () => {
    // Don't reset database - tests should use the same test data
    // Only reset if a test specifically modifies data that affects other tests
  });

  describe('POST /api/users/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.SUPERADMIN.username,
          password: TEST_USERS.SUPERADMIN.password
        });

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toHaveValidJWT();
      expect(response.body).toHaveProperty('user');
      validateUserObject(response.body.user);
      expect(response.body.user.username).toBe(TEST_USERS.SUPERADMIN.username);
      expect(response.body.user.superadmin).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.SUPERADMIN.username,
          password: 'wrongpassword'
        });

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid/i);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({});

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users', () => {
    it('should return all users for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check first user structure and workspace stats
      const user = response.body[0];
      validateUserObject(user);
      expect(user).toHaveProperty('workspace_count');
      expect(user).toHaveProperty('admin_workspaces');
      expect(user).toHaveProperty('collaborator_workspaces');
      expect(user).toHaveProperty('viewer_workspaces');

      expect(typeof user.workspace_count).toBe('number');
      expect(typeof user.admin_workspaces).toBe('number');
      expect(typeof user.collaborator_workspaces).toBe('number');
      expect(typeof user.viewer_workspaces).toBe('number');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/users');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin privileges required/i);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/users');

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return specific user for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/users/${TEST_USERS.TESTUSER1.id}`);

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(TEST_USERS.TESTUSER1.username);
      expect(response.body.id).toBe(TEST_USERS.TESTUSER1.id);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get(`/api/users/${TEST_USERS.SUPERADMIN.id}`);

      validateApiResponse(response, 403);
    });
  });

  describe('POST /api/users', () => {
    it('should create new user as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const userData = generateRandomData();

      const response = await auth.post('/api/users')
        .send({
          username: userData.username,
          password: userData.password,
          superadmin: false
        });

      validateApiResponse(response, 201);
      validateUserObject(response.body);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.superadmin).toBe(false);
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });

    it('should create superadmin user', async () => {
      const auth = authenticatedRequest(superadminToken);
      const userData = generateRandomData();

      const response = await auth.post('/api/users')
        .send({
          username: userData.username,
          password: userData.password,
          superadmin: true
        });

      validateApiResponse(response, 201);
      validateUserObject(response.body);
      expect(response.body.superadmin).toBe(true);
    });

    it('should reject duplicate username', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/users')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: 'password123'
        });

      validateApiResponse(response, 409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/username.*exists/i);
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/users')
        .send({
          username: 'testuser'
          // missing password
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const userData = generateRandomData();

      const response = await auth.post('/api/users')
        .send({
          username: userData.username,
          password: userData.password
        });

      validateApiResponse(response, 403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const newUsername = `updated_${Date.now()}`;

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: newUsername,
          superadmin: true
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(newUsername);
      expect(response.body.superadmin).toBe(true);
    });

    it('should update user password', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: 'newpassword123'
        });

      validateApiResponse(response, 200);

      // Verify password was updated by attempting login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: 'newpassword123'
        });

      validateApiResponse(loginResponse, 200);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put('/api/users/99999')
        .send({
          username: 'updated'
        });

      validateApiResponse(response, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.put(`/api/users/${TEST_USERS.SUPERADMIN.id}`)
        .send({
          username: 'hacked'
        });

      validateApiResponse(response, 403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // First create a new user with no workspace relationships
      const userData = generateRandomData();
      const createResponse = await auth.post('/api/users')
        .send({
          username: userData.username,
          password: userData.password,
          superadmin: false
        });

      const newUserId = createResponse.body.id;

      // Now delete the newly created user
      const response = await auth.delete(`/api/users/${newUserId}`);

      validateApiResponse(response, 204);

      // For 204 responses, there's no JSON body to check
      // Verify user is deleted by attempting to get it
      const getResponse = await auth.get(`/api/users/${newUserId}`);
      validateApiResponse(getResponse, 404);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/users/99999');

      validateApiResponse(response, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER2.id}`);

      validateApiResponse(response, 403);
    });

    it('should prevent self-deletion', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.SUPERADMIN.id}`);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot delete.*own account/i);
    });
  });
});
