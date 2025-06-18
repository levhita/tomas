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
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  validateWorkspaceObject,
  generateRandomData,
  app
} = require('../utils/test-helpers');

describe('Workspace Management API', () => {
  let superadminToken;
  let testUserToken;
  let adminUserToken;

  beforeAll(async () => {
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
  });

  beforeEach(async () => {
    await resetDatabase();
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
    // testuser1 is admin of workspace 2
    adminUserToken = testUserToken;
  });

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
      await auth.post('/api/users')
        .send({
          username: userData.username,
          password: userData.password
        });

      // Login as the new user
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          username: userData.username,
          password: userData.password
        });

      const newUserAuth = authenticatedRequest(loginResponse.body.token);
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
});
