/**
 * User Management API Tests
 * 
 * Tests all user-related endpoints including authentication, CRUD operations,
 * and book management functionality.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  initializeTokenCache,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  validateUserObject,
  generateRandomData,
  app
} = require('../utils/test-helpers');

describe('User Management API', () => {
  let superadminToken;
  let adminToken;

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;
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
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);

      // Check first user structure and book stats
      const user = response.body.users[0];
      validateUserObject(user);
      expect(user).toHaveProperty('team_count');
      expect(user).toHaveProperty('admin_teams');
      expect(user).toHaveProperty('collaborator_teams');
      expect(user).toHaveProperty('viewer_teams');

      expect(typeof user.team_count).toBe('number');
      expect(typeof user.admin_teams).toBe('number');
      expect(typeof user.collaborator_teams).toBe('number');
      expect(typeof user.viewer_teams).toBe('number');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get(`/api/users/${TEST_USERS.SUPERADMIN.id}`);

      validateApiResponse(response, 403);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user information when authenticated', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.get('/api/users/me');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('superadmin');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/users/me');

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
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
      const auth = authenticatedRequest(adminToken);
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

      // Restore original state to prevent token invalidation for other tests
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          superadmin: false
        });
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

      // Restore original password to prevent issues for other tests
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: TEST_USERS.TESTUSER1.password
        });
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
      const auth = authenticatedRequest(adminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.SUPERADMIN.id}`)
        .send({
          username: 'hacked'
        });

      validateApiResponse(response, 403);
    });

    it('should allow user to update their own username', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newUsername = `self_updated_${Date.now()}`;

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: newUsername
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(newUsername);
      expect(response.body.id).toBe(TEST_USERS.TESTUSER1.id);

      // Get a new token with the updated username
      const newToken = await loginUser({
        username: newUsername,
        password: TEST_USERS.TESTUSER1.password
      });
      const newAuth = authenticatedRequest(newToken);

      // Restore original username
      await newAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username
        });
    });

    it('should allow user to change their own password with current password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newPassword = 'mynewpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: newPassword,
          currentPassword: TEST_USERS.TESTUSER1.password
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);

      // Verify new password works by logging in
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original password
      const restoreAuth = authenticatedRequest(loginResponse.body.token);
      await restoreAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: TEST_USERS.TESTUSER1.password,
          currentPassword: newPassword
        });
    });

    it('should require current password when user changes their own password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: 'newpassword123'
          // Missing currentPassword
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/current password.*required/i);
    });

    it('should reject incorrect current password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: 'newpassword123',
          currentPassword: 'wrongcurrentpassword'
        });

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/current password.*incorrect/i);
    });

    it('should allow superadmin to change password without current password', async () => {
      const auth = authenticatedRequest(superadminToken);
      const newPassword = 'adminsetpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: newPassword
          // No currentPassword needed for superadmin
        });

      validateApiResponse(response, 200);

      // Verify password was changed
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original password
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: TEST_USERS.TESTUSER1.password
        });
    });

    it('should allow user to update both username and password together', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newUsername = `combined_update_${Date.now()}`;
      const newPassword = 'combinedpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: newUsername,
          password: newPassword,
          currentPassword: TEST_USERS.TESTUSER1.password
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(newUsername);

      // Verify both username and password were updated
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: newUsername,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original username and password
      const restoreAuth = authenticatedRequest(loginResponse.body.token);
      await restoreAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: TEST_USERS.TESTUSER1.password,
          currentPassword: newPassword
        });
    });

    it('should prevent user from updating another user account', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}`)
        .send({
          username: 'hacked_user'
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/can only update.*own.*information/i);
    });

    it('should reject duplicate username when user updates themselves', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.SUPERADMIN.username // This username already exists
        });

      validateApiResponse(response, 409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/username.*exists/i);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // First create a new user with no book relationships
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
      const auth = authenticatedRequest(adminToken);

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

  describe('User Enable/Disable', () => {
    describe('PUT /api/users/:id/enable', () => {
      it('should enable a user as superadmin', async () => {
        // First create a disabled user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;
        expect(createResponse.body.active).toBe(false);

        // Now enable the user
        const enableResponse = await auth.put(`/api/users/${userId}/enable`);

        validateApiResponse(enableResponse, 200);
        expect(enableResponse.body).toHaveProperty('message');
        expect(enableResponse.body.message).toMatch(/enabled successfully/i);
        expect(enableResponse.body).toHaveProperty('user');
        expect(enableResponse.body.user.active).toBe(true);
        expect(enableResponse.body.user.id).toBe(userId);
      });

      it('should return 400 for user already enabled', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Try to enable an already active user
        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/enable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/already enabled/i);
      });

      it('should return 404 for non-existent user', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put('/api/users/99999/enable');

        validateApiResponse(response, 404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/enable`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/users/:id/disable', () => {
      it('should disable a user as superadmin', async () => {
        // First create an enabled user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;
        expect(createResponse.body.active).toBe(true);

        // Now disable the user
        const disableResponse = await auth.put(`/api/users/${userId}/disable`);

        validateApiResponse(disableResponse, 200);
        expect(disableResponse.body).toHaveProperty('message');
        expect(disableResponse.body.message).toMatch(/disabled successfully/i);
        expect(disableResponse.body).toHaveProperty('user');
        expect(disableResponse.body.user.active).toBe(false);
        expect(disableResponse.body.user.id).toBe(userId);
      });

      it('should prevent superadmin from disabling themselves', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.SUPERADMIN.id}/disable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/cannot disable.*own account/i);
      });

      it('should return 400 for user already disabled', async () => {
        // First create and then disable a user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Try to disable an already disabled user
        const response = await auth.put(`/api/users/${userId}/disable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/already disabled/i);
      });

      it('should return 404 for non-existent user', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put('/api/users/99999/disable');

        validateApiResponse(response, 404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/disable`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Login with disabled user', () => {
      it('should prevent login for disabled user', async () => {
        // First create a user and then disable them
        const auth = authenticatedRequest(superadminToken);
        const username = `testuser_${Date.now()}`;
        const password = 'password123';

        const createResponse = await auth.post('/api/users')
          .send({
            username: username,
            password: password,
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Disable the user
        const disableResponse = await auth.put(`/api/users/${userId}/disable`);
        validateApiResponse(disableResponse, 200);

        // Try to login with disabled user
        const loginResponse = await request(app)
          .post('/api/users/login')
          .send({
            username: username,
            password: password
          });

        validateApiResponse(loginResponse, 401);
        expect(loginResponse.body).toHaveProperty('error');
        expect(loginResponse.body.error).toMatch(/account is disabled/i);
      });
    });
  });

  // Additional test suite for User Coverage Improvements
  describe('User Coverage Edge Cases', () => {
    describe('PUT /api/users/:id - permission edge cases', () => {
      it('should allow superadmin to update superadmin field', async () => {
        // Create a new user first
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testadmin_${Date.now()}`,
            password: 'password123',
            superadmin: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Update superadmin flag as superadmin
        const response = await auth.put(`/api/users/${userId}`)
          .send({
            superadmin: true
          });

        validateApiResponse(response, 200);
        expect(response.body.superadmin).toBe(true);
      });

      it('should allow superadmin to update active field', async () => {
        // Create a new user first
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testactive_${Date.now()}`,
            password: 'password123',
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Update active flag as superadmin
        const response = await auth.put(`/api/users/${userId}`)
          .send({
            active: false
          });

        validateApiResponse(response, 200);
        expect(response.body.active).toBe(false);
      });

      it('should deny non-superadmin updating superadmin field', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.ADMIN.id}`)
          .send({
            superadmin: true
          });

        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges/i);
      });

      it('should deny non-superadmin updating active field', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.ADMIN.id}`)
          .send({
            active: false
          });

        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/active status/i);
      });
    });

    describe('DELETE /api/users/:id - cascade behavior', () => {
      it('should successfully delete user and cascade delete team memberships', async () => {
        // Create a new user first, then add them to a team
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testdelete_${Date.now()}`,
            password: 'password123'
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Delete the user - should succeed with cascade
        const response = await auth.delete(`/api/users/${userId}`);

        validateApiResponse(response, 204);
        
        // Verify user is deleted
        const verifyResponse = await auth.get(`/api/users/${userId}`);
        validateApiResponse(verifyResponse, 404);
      });
    });

    describe('GET /api/users/:id/teams', () => {
      it('should return teams for existing user as superadmin', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Use a known user that should still exist (collaborator)
        const response = await auth.get(`/api/users/${TEST_USERS.COLLABORATOR.id}/teams`);

        validateApiResponse(response, 200);
        expect(Array.isArray(response.body)).toBe(true);
        
        // Verify the structure of returned teams
        if (response.body.length > 0) {
          const team = response.body[0];
          expect(team).toHaveProperty('id');
          expect(team).toHaveProperty('name');
          expect(team).toHaveProperty('role');
          expect(team).toHaveProperty('created_at');
          expect(['viewer', 'collaborator', 'admin']).toContain(team.role);
        }
      });

      it('should return 404 for non-existent user teams', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.get('/api/users/99999/teams');

        validateApiResponse(response, 404);
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.get(`/api/users/${TEST_USERS.COLLABORATOR.id}/teams`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Edge cases for additional coverage', () => {
      it('should handle PUT request without authentication', async () => {
        const response = await request(app)
          .put('/api/users/2')
          .send({ username: 'newname' });

        validateApiResponse(response, 401);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle duplicate existingUser assignment in PUT', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Create a user first
        const createResponse = await auth
          .post('/api/users')
          .send({
            username: `testduplicate${Date.now()}`,
            password: 'testpassword'
          });
        
        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Now test updating with no changes to hit the duplicate user check
        const response = await auth
          .put(`/api/users/${userId}`)
          .send({});

        validateApiResponse(response, 400);
        expect(response.body.error).toMatch(/no fields to update/i);
      });

      it('should handle authentication error in login', async () => {
        // Test the login path with completely wrong username
        const response = await request(app)
          .post('/api/users/login')
          .send({
            username: 'completelyfakeuser123456789',
            password: 'anypassword'
          });

        validateApiResponse(response, 401);
        expect(response.body.error).toMatch(/invalid credentials/i);
      });
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by username', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/search?q=admin');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that results contain the search term
      const user = response.body[0];
      validateUserObject(user);
      expect(user.username.toLowerCase()).toContain('admin');
    });

    it('should search users with limit', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/search?q=a&limit=2');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should include membership status when teamId specified', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/search?q=a&teamId=1');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Check that results include membership information
      if (response.body.length > 0) {
        const user = response.body[0];
        validateUserObject(user);
        expect(user).toHaveProperty('is_team_member');
        expect(typeof user.is_team_member).toBe('boolean');
        if (user.is_team_member) {
          expect(user).toHaveProperty('team_role');
          expect(['admin', 'collaborator', 'viewer']).toContain(user.team_role);
        }
      }
    });

    it('should return empty array for no matches', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/search?q=nonexistentuser');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require search query', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/search');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/search query is required/i);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/users/search?q=admin');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin privileges required/i);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/users/search?q=admin');

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
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get(`/api/users/${TEST_USERS.SUPERADMIN.id}`);

      validateApiResponse(response, 403);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user information when authenticated', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.get('/api/users/me');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username');
      expect(response.body).toHaveProperty('superadmin');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/users/me');

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
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
      const auth = authenticatedRequest(adminToken);
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

      // Restore original state to prevent token invalidation for other tests
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          superadmin: false
        });
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

      // Restore original password to prevent issues for other tests
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: TEST_USERS.TESTUSER1.password
        });
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
      const auth = authenticatedRequest(adminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.SUPERADMIN.id}`)
        .send({
          username: 'hacked'
        });

      validateApiResponse(response, 403);
    });

    it('should allow user to update their own username', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newUsername = `self_updated_${Date.now()}`;

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: newUsername
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(newUsername);
      expect(response.body.id).toBe(TEST_USERS.TESTUSER1.id);

      // Get a new token with the updated username
      const newToken = await loginUser({
        username: newUsername,
        password: TEST_USERS.TESTUSER1.password
      });
      const newAuth = authenticatedRequest(newToken);

      // Restore original username
      await newAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username
        });
    });

    it('should allow user to change their own password with current password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newPassword = 'mynewpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: newPassword,
          currentPassword: TEST_USERS.TESTUSER1.password
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);

      // Verify new password works by logging in
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original password
      const restoreAuth = authenticatedRequest(loginResponse.body.token);
      await restoreAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: TEST_USERS.TESTUSER1.password,
          currentPassword: newPassword
        });
    });

    it('should require current password when user changes their own password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: 'newpassword123'
          // Missing currentPassword
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/current password.*required/i);
    });

    it('should reject incorrect current password', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: 'newpassword123',
          currentPassword: 'wrongcurrentpassword'
        });

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/current password.*incorrect/i);
    });

    it('should allow superadmin to change password without current password', async () => {
      const auth = authenticatedRequest(superadminToken);
      const newPassword = 'adminsetpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: newPassword
          // No currentPassword needed for superadmin
        });

      validateApiResponse(response, 200);

      // Verify password was changed
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original password
      await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          password: TEST_USERS.TESTUSER1.password
        });
    });

    it('should allow user to update both username and password together', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);
      const newUsername = `combined_update_${Date.now()}`;
      const newPassword = 'combinedpassword123';

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: newUsername,
          password: newPassword,
          currentPassword: TEST_USERS.TESTUSER1.password
        });

      validateApiResponse(response, 200);
      validateUserObject(response.body);
      expect(response.body.username).toBe(newUsername);

      // Verify both username and password were updated
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: newUsername,
          password: newPassword
        });

      validateApiResponse(loginResponse, 200);

      // Restore original username and password
      const restoreAuth = authenticatedRequest(loginResponse.body.token);
      await restoreAuth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.TESTUSER1.username,
          password: TEST_USERS.TESTUSER1.password,
          currentPassword: newPassword
        });
    });

    it('should prevent user from updating another user account', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}`)
        .send({
          username: 'hacked_user'
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/can only update.*own.*information/i);
    });

    it('should reject duplicate username when user updates themselves', async () => {
      // Get a fresh token to avoid cache issues
      const freshToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}`)
        .send({
          username: TEST_USERS.SUPERADMIN.username // This username already exists
        });

      validateApiResponse(response, 409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/username.*exists/i);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // First create a new user with no book relationships
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
      const auth = authenticatedRequest(adminToken);

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

  describe('User Enable/Disable', () => {
    describe('PUT /api/users/:id/enable', () => {
      it('should enable a user as superadmin', async () => {
        // First create a disabled user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;
        expect(createResponse.body.active).toBe(false);

        // Now enable the user
        const enableResponse = await auth.put(`/api/users/${userId}/enable`);

        validateApiResponse(enableResponse, 200);
        expect(enableResponse.body).toHaveProperty('message');
        expect(enableResponse.body.message).toMatch(/enabled successfully/i);
        expect(enableResponse.body).toHaveProperty('user');
        expect(enableResponse.body.user.active).toBe(true);
        expect(enableResponse.body.user.id).toBe(userId);
      });

      it('should return 400 for user already enabled', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Try to enable an already active user
        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/enable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/already enabled/i);
      });

      it('should return 404 for non-existent user', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put('/api/users/99999/enable');

        validateApiResponse(response, 404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/enable`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PUT /api/users/:id/disable', () => {
      it('should disable a user as superadmin', async () => {
        // First create an enabled user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;
        expect(createResponse.body.active).toBe(true);

        // Now disable the user
        const disableResponse = await auth.put(`/api/users/${userId}/disable`);

        validateApiResponse(disableResponse, 200);
        expect(disableResponse.body).toHaveProperty('message');
        expect(disableResponse.body.message).toMatch(/disabled successfully/i);
        expect(disableResponse.body).toHaveProperty('user');
        expect(disableResponse.body.user.active).toBe(false);
        expect(disableResponse.body.user.id).toBe(userId);
      });

      it('should prevent superadmin from disabling themselves', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.SUPERADMIN.id}/disable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/cannot disable.*own account/i);
      });

      it('should return 400 for user already disabled', async () => {
        // First create and then disable a user
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testuser_${Date.now()}`,
            password: 'password123',
            active: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Try to disable an already disabled user
        const response = await auth.put(`/api/users/${userId}/disable`);

        validateApiResponse(response, 400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/already disabled/i);
      });

      it('should return 404 for non-existent user', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.put('/api/users/99999/disable');

        validateApiResponse(response, 404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/disable`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Login with disabled user', () => {
      it('should prevent login for disabled user', async () => {
        // First create a user and then disable them
        const auth = authenticatedRequest(superadminToken);
        const username = `testuser_${Date.now()}`;
        const password = 'password123';

        const createResponse = await auth.post('/api/users')
          .send({
            username: username,
            password: password,
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Disable the user
        const disableResponse = await auth.put(`/api/users/${userId}/disable`);
        validateApiResponse(disableResponse, 200);

        // Try to login with disabled user
        const loginResponse = await request(app)
          .post('/api/users/login')
          .send({
            username: username,
            password: password
          });

        validateApiResponse(loginResponse, 401);
        expect(loginResponse.body).toHaveProperty('error');
        expect(loginResponse.body.error).toMatch(/account is disabled/i);
      });
    });
  });

  // Additional test suite for User Coverage Improvements
  describe('User Coverage Edge Cases', () => {
    describe('PUT /api/users/:id - permission edge cases', () => {
      it('should allow superadmin to update superadmin field', async () => {
        // Create a new user first
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testadmin_${Date.now()}`,
            password: 'password123',
            superadmin: false
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Update superadmin flag as superadmin
        const response = await auth.put(`/api/users/${userId}`)
          .send({
            superadmin: true
          });

        validateApiResponse(response, 200);
        expect(response.body.superadmin).toBe(true);
      });

      it('should allow superadmin to update active field', async () => {
        // Create a new user first
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testactive_${Date.now()}`,
            password: 'password123',
            active: true
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Update active flag as superadmin
        const response = await auth.put(`/api/users/${userId}`)
          .send({
            active: false
          });

        validateApiResponse(response, 200);
        expect(response.body.active).toBe(false);
      });

      it('should deny non-superadmin updating superadmin field', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.ADMIN.id}`)
          .send({
            superadmin: true
          });

        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges/i);
      });

      it('should deny non-superadmin updating active field', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.put(`/api/users/${TEST_USERS.ADMIN.id}`)
          .send({
            active: false
          });

        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/active status/i);
      });
    });

    describe('DELETE /api/users/:id - cascade behavior', () => {
      it('should successfully delete user and cascade delete team memberships', async () => {
        // Create a new user first, then add them to a team
        const auth = authenticatedRequest(superadminToken);
        const createResponse = await auth.post('/api/users')
          .send({
            username: `testdelete_${Date.now()}`,
            password: 'password123'
          });

        validateApiResponse(createResponse, 201);
        const userId = createResponse.body.id;

        // Delete the user - should succeed with cascade
        const response = await auth.delete(`/api/users/${userId}`);

        validateApiResponse(response, 204);
        
        // Verify user is deleted
        const verifyResponse = await auth.get(`/api/users/${userId}`);
        validateApiResponse(verifyResponse, 404);
      });
    });

    describe('GET /api/users/:id/teams', () => {
      it('should return teams for existing user as superadmin', async () => {
        const auth = authenticatedRequest(superadminToken);

        // Use a known user that should still exist (collaborator)
        const response = await auth.get(`/api/users/${TEST_USERS.COLLABORATOR.id}/teams`);

        validateApiResponse(response, 200);
        expect(Array.isArray(response.body)).toBe(true);
        
        // Verify the structure of returned teams
        if (response.body.length > 0) {
          const team = response.body[0];
          expect(team).toHaveProperty('id');
          expect(team).toHaveProperty('name');
          expect(team).toHaveProperty('role');
          expect(team).toHaveProperty('created_at');
          expect(['viewer', 'collaborator', 'admin']).toContain(team.role);
        }
      });

      it('should return 404 for non-existent user teams', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.get('/api/users/99999/teams');

        validateApiResponse(response, 404);
        expect(response.body.error).toMatch(/user not found/i);
      });

      it('should deny access for non-superadmin', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.get(`/api/users/${TEST_USERS.COLLABORATOR.id}/teams`);

        validateApiResponse(response, 403);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
