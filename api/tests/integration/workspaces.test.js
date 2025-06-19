/**
 * Workspace Management API Tests
 * 
 * Tests all workspace-related endpoints including CRUD operations,
 * user management, and search functionality.
 */

const request = require('supertest');
const {
  TEST_USERS,
  TEST_WORKSPACES,
  loginUser,
  getOrInitializeTokens,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  validateWorkspaceObject,
  generateRandomData,
  createTestUser,
  app
} = require('../utils/test-helpers');

describe('Workspace Management API', () => {
  let superadminToken;
  let testUserToken;
  let adminUserToken;
  let regularUserToken;

  beforeAll(async () => {
    // Initialize token cache once for all tests
    const tokens = await getOrInitializeTokens();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
    regularUserToken = tokens.regularuser;
    // testuser1 is admin of workspace 2
    adminUserToken = testUserToken;
  });

  // Reset database only before tests that modify data or create conflicts
  const resetBeforeTest = async () => {
    await resetDatabase();
    // Tokens should still be valid, but get them from cache or re-initialize if needed
    const tokens = await getOrInitializeTokens();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
    regularUserToken = tokens.regularuser;
    adminUserToken = testUserToken;
  };

  describe('GET /api/workspaces', () => {
    it('should return user workspaces for authenticated user', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/workspaces');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check workspace structure
      const workspace = response.body[0];
      validateWorkspaceObject(workspace);
      expect(workspace).toHaveProperty('role');
      expect(['viewer', 'collaborator', 'admin']).toContain(workspace.role);
    });

    it('should return empty array for user with no workspaces', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Create a new user with no workspace access
      const userData = generateRandomData();
      const newUser = await createTestUser({
        username: userData.username,
        password: userData.password
      }, superadminToken);

      // Get token for the new user directly through cache
      const newUserToken = await loginUser({
        username: userData.username,
        password: userData.password,
        id: newUser.id
      });

      const newUserAuth = authenticatedRequest(newUserToken);
      const response = await newUserAuth.get('/api/workspaces');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/workspaces');

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/workspaces/all', () => {
    it('should return all workspaces for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/all');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that all test workspaces are included
      const workspaceIds = response.body.map(w => w.id);
      expect(workspaceIds).toContain(TEST_WORKSPACES.WORKSPACE1.id);
      expect(workspaceIds).toContain(TEST_WORKSPACES.WORKSPACE2.id);
      expect(workspaceIds).toContain(TEST_WORKSPACES.SEARCH_WORKSPACE.id);

      // Verify structure
      response.body.forEach(workspace => {
        validateWorkspaceObject(workspace);
      });
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/workspaces/all');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin privileges required/i);
    });
  });

  describe('GET /api/workspaces/search', () => {
    it('should search workspaces by name for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/search?q=Test&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all results contain "Test" in name
      response.body.forEach(workspace => {
        validateWorkspaceObject(workspace);
        expect(workspace.name.toLowerCase()).toContain('test');
      });
    });

    it('should search workspaces by ID for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/workspaces/search?q=${TEST_WORKSPACES.WORKSPACE1.id}&limit=10`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const workspace = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
        expect(workspace).toBeDefined();
        validateWorkspaceObject(workspace);
      }
    });

    it('should limit search results', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/search?q=Workspace&limit=2');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/search?q=NonExistentWorkspace&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require search query parameter', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/search');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/workspaces/search?q=Test&limit=10');

      validateApiResponse(response, 403);
    });
  });

  describe('GET /api/workspaces/:id', () => {
    it('should return workspace for user with access', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 200);
      validateWorkspaceObject(response.body);
      expect(response.body.id).toBe(TEST_WORKSPACES.WORKSPACE1.id);
      expect(response.body.name).toBe(TEST_WORKSPACES.WORKSPACE1.name);
    });

    it('should deny access to workspace user has no access to', async () => {
      const auth = authenticatedRequest(testUserToken);
      // testuser1 has no access to workspace 4
      const response = await auth.get('/api/workspaces/4');

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/workspaces/99999');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/workspaces', () => {
    beforeEach(resetBeforeTest);

    it('should create new workspace', async () => {
      const auth = authenticatedRequest(testUserToken);
      const workspaceData = generateRandomData();

      const response = await auth.post('/api/workspaces')
        .send({
          name: workspaceData.workspaceName,
          description: 'Test workspace description',
          currency_symbol: '€',
          week_start: 'sunday'
        });

      validateApiResponse(response, 201);
      validateWorkspaceObject(response.body);
      expect(response.body.name).toBe(workspaceData.workspaceName);
      expect(response.body.description).toBe('Test workspace description');
      expect(response.body.currency_symbol).toBe('€');
      expect(response.body.week_start).toBe('sunday');
    });

    it('should create workspace with minimal data', async () => {
      const auth = authenticatedRequest(testUserToken);
      const workspaceData = generateRandomData();

      const response = await auth.post('/api/workspaces')
        .send({
          name: workspaceData.workspaceName
        });

      validateApiResponse(response, 201);
      validateWorkspaceObject(response.body);
      expect(response.body.name).toBe(workspaceData.workspaceName);
      expect(response.body.currency_symbol).toBe('$'); // default
      expect(response.body.week_start).toBe('monday'); // default
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post('/api/workspaces')
        .send({
          description: 'Missing name'
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .post('/api/workspaces')
        .send({
          name: 'Test Workspace'
        });

      validateApiResponse(response, 401);
    });
  });

  describe('PUT /api/workspaces/:id', () => {
    beforeEach(resetBeforeTest);

    it('should update workspace as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const newName = `Updated ${Date.now()}`;

      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`)
        .send({
          name: newName,
          description: 'Updated description',
          currency_symbol: '¥',
          week_start: 'sunday'
        });

      validateApiResponse(response, 200);
      validateWorkspaceObject(response.body);
      expect(response.body.name).toBe(newName);
      expect(response.body.description).toBe('Updated description');
      expect(response.body.currency_symbol).toBe('¥');
      expect(response.body.week_start).toBe('sunday');
    });

    it('should deny access for non-admin user', async () => {
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in workspace 1, not admin
      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({
          name: 'Hacked Name'
        });

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put('/api/workspaces/99999')
        .send({
          name: 'Updated'
        });

      validateApiResponse(response, 404);
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    beforeEach(resetBeforeTest);

    it('should soft delete workspace as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/deleted/i);

      // Verify workspace is soft deleted (should return 404)
      const getResponse = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`);
      validateApiResponse(getResponse, 404);
    });

    it('should deny access for non-admin user', async () => {
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in workspace 1, not admin
      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/workspaces/99999');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/workspaces/:id/restore', () => {
    beforeEach(async () => {
      await resetBeforeTest();
      // Soft delete a workspace first
      const auth = authenticatedRequest(adminUserToken);
      await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`);
    });

    it('should restore soft-deleted workspace as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 200);
      validateWorkspaceObject(response.body);
      expect(response.body.id).toBe(TEST_WORKSPACES.WORKSPACE2.id);

      // Verify workspace is accessible again
      const getResponse = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`);
      validateApiResponse(getResponse, 200);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/workspaces/99999/restore');

      validateApiResponse(response, 404);
    });

    it('should return 400 for already active workspace', async () => {
      // First restore the workspace
      const auth = authenticatedRequest(superadminToken);
      await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      // Try to restore again
      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 400);
    });
  });

  describe('DELETE /api/workspaces/:id/permanent', () => {
    let deletableWorkspaceId;

    beforeEach(async () => {
      await resetBeforeTest();
      // Create a fresh workspace with no dependent data for deletion testing
      const auth = authenticatedRequest(superadminToken);
      const createResponse = await auth.post('/api/workspaces')
        .send({
          name: 'Deletable Workspace',
          description: 'Workspace for deletion testing'
        });

      deletableWorkspaceId = createResponse.body.id;

      // Soft delete it first
      await auth.delete(`/api/workspaces/${deletableWorkspaceId}`);
    });

    it('should cascade delete workspace with existing data', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Soft delete workspace 2 first (it has accounts)
      await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}`);

      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/permanent`);

      validateApiResponse(response, 204);

      // Verify the workspace is completely deleted (should get 404)
      const checkResponse = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);
      validateApiResponse(checkResponse, 404);
    });

    it('should permanently delete empty workspace as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/workspaces/${deletableWorkspaceId}/permanent`);

      validateApiResponse(response, 204);

      // Verify workspace cannot be restored
      const restoreResponse = await auth.post(`/api/workspaces/${deletableWorkspaceId}/restore`);
      validateApiResponse(restoreResponse, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const superAuth = authenticatedRequest(superadminToken);

      // Use the deletable workspace that was already created and soft-deleted in beforeAll
      // testuser1 doesn't have access to this workspace, so this should fail with 403
      const response = await auth.delete(`/api/workspaces/${deletableWorkspaceId}/permanent`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/workspaces/99999/permanent');

      validateApiResponse(response, 404);
    });

    it('should return 400 for active workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Try to permanently delete an active workspace
      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/permanent`);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/soft-deleted/i);
    });
  });

  describe('GET /api/workspaces/:id/users', () => {
    it('should return workspace users for admin', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check user structure
      const user = response.body[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('role');
      expect(['admin', 'collaborator', 'viewer']).toContain(user.role);
    });

    it('should return workspace users for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/users`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access for non-member', async () => {
      const auth = authenticatedRequest(regularUserToken);

      // regularuser is not a member of workspace 1
      const response = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/users`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/workspaces/99999/users');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/workspaces/:id/users', () => {
    beforeEach(resetBeforeTest);
    it('should add user to workspace as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify user was added
      const usersResponse = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`);
      const addedUser = usersResponse.body.find(u => u.id === userData.userId);
      expect(addedUser).toBeDefined();
      expect(addedUser.role).toBe(userData.role);
    });

    it('should add user with different roles', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const roles = ['admin', 'collaborator', 'viewer'];

      for (const role of roles) {
        // Create a new user for each role test
        const createUserResponse = await authenticatedRequest(superadminToken)
          .post('/api/users')
          .send({
            username: `testuser_${role}_${Date.now()}`,
            password: 'testpassword123'
          });

        const userId = createUserResponse.body.id;
        const userData = { userId: userId, role };

        const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
          .send(userData);

        validateApiResponse(response, 201);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      // testuser1 is collaborator in workspace 1, not admin
      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/users`)
        .send(userData);

      validateApiResponse(response, 403);
    });

    it('should return 409 for user already in workspace', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.TESTUSER1.id, // Already a member
        role: 'viewer'
      };

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/already/i);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: 99999,
        role: 'viewer'
      };

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await auth.post('/api/workspaces/99999/users')
        .send(userData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'invalid_role'
      };

      const response = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(adminUserToken);

      // Missing userId
      const response1 = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({ role: 'viewer' });

      validateApiResponse(response1, 400);

      // Missing role
      const response2 = await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({ userId: TEST_USERS.REGULARUSER.id });

      validateApiResponse(response2, 400);
    });

    it('should allow superadmin to add users to any workspace', async () => {
      // Create a new workspace as testuser1 (superadmin won't be a member)
      const testUserAuth = authenticatedRequest(testUserToken);
      const createResponse = await testUserAuth.post('/api/workspaces')
        .send({
          name: 'Test Workspace for Superadmin Access',
          description: 'Testing superadmin access'
        });

      const newWorkspaceId = createResponse.body.id;

      // Now superadmin should be able to add users to this workspace even though they're not a member
      const superAuth = authenticatedRequest(superadminToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await superAuth.post(`/api/workspaces/${newWorkspaceId}/users`)
        .send(userData);

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify user was added
      const usersResponse = await superAuth.get(`/api/workspaces/${newWorkspaceId}/users`);
      const addedUser = usersResponse.body.find(u => u.id === userData.userId);
      expect(addedUser).toBeDefined();
      expect(addedUser.role).toBe(userData.role);
    });
  });

  describe('PUT /api/workspaces/:id/users/:userId', () => {
    beforeEach(async () => {
      await resetBeforeTest();
      // Add regularuser to workspace2 as viewer
      const auth = authenticatedRequest(adminUserToken);
      await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({
          userId: TEST_USERS.REGULARUSER.id,
          role: 'viewer'
        });
    });

    it('should update user role as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'collaborator' };

      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role was updated
      const updatedUser = response.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.role).toBe(updateData.role);
    });

    it('should update to all valid roles', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const roles = ['admin', 'collaborator', 'viewer'];

      for (const role of roles) {
        const updateData = { role };

        const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
          .send(updateData);

        validateApiResponse(response, 200);
        expect(Array.isArray(response.body)).toBe(true);
        const updatedUser = response.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
        expect(updatedUser.role).toBe(role);
      }
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);
      const updateData = { role: 'admin' };

      // testuser1 is collaborator in workspace 1, not admin
      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/99999`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/workspaces/99999/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for user not in workspace', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'admin' };

      // Remove regularuser first
      await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'invalid_role' };

      const response = await auth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });

    it('should allow superadmin to demote last admin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // First remove superadmin from workspace2, leaving only testuser1 as admin
      await superAuth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now superadmin should be able to demote the last admin (testuser1) from workspace2
      const updateData = { role: 'viewer' };
      const response = await superAuth.put(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`)
        .send(updateData);

      // This should succeed for superadmin even though it's demoting the last admin
      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role was updated
      const updatedUser = response.body.find(u => u.id === TEST_USERS.TESTUSER1.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.role).toBe('viewer');
    });
  });

  describe('DELETE /api/workspaces/:id/users/:userId', () => {
    beforeEach(async () => {
      await resetBeforeTest();
      // Add regularuser to workspace2 as viewer
      const auth = authenticatedRequest(adminUserToken);
      await auth.post(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({
          userId: TEST_USERS.REGULARUSER.id,
          role: 'viewer'
        });
    });

    it('should remove user from workspace as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 204);

      // Verify user was removed
      const usersResponse = await auth.get(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users`);
      const removedUser = usersResponse.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
      expect(removedUser).toBeUndefined();
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in workspace 1, not admin
      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/99999`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/workspaces/99999/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for user not in workspace', async () => {
      const auth = authenticatedRequest(adminUserToken);

      // Remove regularuser first
      await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      // Try to remove again
      const response = await auth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 404);
    });

    it('should prevent removing last admin for non-superadmin', async () => {
      const superAuth = authenticatedRequest(superadminToken);
      const adminAuth = authenticatedRequest(adminUserToken);

      // First remove superadmin from workspace2, leaving only testuser1 as admin
      await superAuth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now try to remove the last admin (testuser1) from workspace2 using testuser1's token
      const response = await adminAuth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`);

      // This should be prevented with 409 Conflict for non-superadmin
      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/last admin/i);
    });

    it('should allow superadmin to remove last admin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // First remove superadmin from workspace2, leaving only testuser1 as admin
      await superAuth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now superadmin should be able to remove the last admin (testuser1) from workspace2
      const response = await superAuth.delete(`/api/workspaces/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`);

      // This should succeed for superadmin
      validateApiResponse(response, 204);
    });
  });
});
