/**
 * User Workspace Management API Tests
 * 
 * Tests the workspace access management endpoints for users.
 */

const request = require('supertest');
const {
  TEST_USERS,
  TEST_WORKSPACES,
  loginUser,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  app
} = require('../utils/test-helpers');

describe('User Workspace Management API', () => {
  let superadminToken;
  let testUserToken;

  beforeAll(async () => {
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
  });

  describe('GET /api/users/:id/workspaces', () => {
    it('should return user workspace access as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const workspace = response.body[0];
        expect(workspace).toHaveProperty('id');
        expect(workspace).toHaveProperty('name');
        expect(workspace).toHaveProperty('role');
        expect(workspace).toHaveProperty('created_at');

        expect(typeof workspace.id).toBe('number');
        expect(typeof workspace.name).toBe('string');
        expect(['viewer', 'collaborator', 'admin']).toContain(workspace.role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/99999/workspaces');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get(`/api/users/${TEST_USERS.SUPERADMIN.id}/workspaces`);

      validateApiResponse(response, 403);
    });
  });

  describe('POST /api/users/:id/workspaces', () => {
    it('should add user to workspace as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Add testuser2 to workspace 2 as viewer
      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces`)
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'viewer'
        });

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the user was added - they should have access to the workspace
      const addedWorkspace = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE2.id);
      expect(addedWorkspace).toBeDefined();
      expect(addedWorkspace.role).toBe('viewer');
    });

    it('should add user as different roles', async () => {
      const auth = authenticatedRequest(superadminToken);
      const roles = ['viewer', 'collaborator', 'admin'];

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];

        // Create a new workspace for each role test to avoid conflicts
        const workspaceResponse = await auth.post('/api/workspaces')
          .send({
            name: `Test Role Workspace ${role}`,
            description: `Workspace for testing ${role} role`,
            currency_symbol: '$'
          });

        validateApiResponse(workspaceResponse, 201);
        const workspaceId = workspaceResponse.body.id;

        const response = await auth.post(`/api/users/${TEST_USERS.REGULARUSER.id}/workspaces`)
          .send({
            workspaceId: workspaceId,
            role: role
          });

        validateApiResponse(response, 201);

        // Verify the role was set correctly
        const checkResponse = await auth.get(`/api/users/${TEST_USERS.REGULARUSER.id}/workspaces`);
        const userWorkspace = checkResponse.body.find(w => w.id === workspaceId);
        expect(userWorkspace).toBeDefined();
        expect(userWorkspace.role).toBe(role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/users/99999/workspaces')
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'viewer'
        });

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces`)
        .send({
          workspaceId: 99999,
          role: 'viewer'
        });

      validateApiResponse(response, 404);
    });

    it('should return 409 if user already has access', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser1 already has access to workspace 1
      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces`)
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'admin'
        });

      validateApiResponse(response, 409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already.*access/i);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces`)
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'invalid_role'
        });

      validateApiResponse(response, 400);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces`)
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'viewer'
        });

      validateApiResponse(response, 403);
    });
  });

  describe('PUT /api/users/:id/workspaces/:workspaceId', () => {
    it('should update user workspace role as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Update testuser1's role in workspace 1 from collaborator to admin
      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({
          role: 'admin'
        });

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the role was updated - find the workspace in the response
      const updatedWorkspace = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace.role).toBe('admin');
    });

    it('should update to all valid roles', async () => {
      const auth = authenticatedRequest(superadminToken);
      const roles = ['viewer', 'collaborator', 'admin'];

      for (const role of roles) {
        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
          .send({ role });

        validateApiResponse(response, 200);

        // Verify the role was updated in the response
        const updatedWorkspace = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
        expect(updatedWorkspace.role).toBe(role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/99999/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/99999`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should return 404 if user has no access to workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser2 has no access to workspace 3 (SEARCH_WORKSPACE)
      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces/${TEST_WORKSPACES.SEARCH_WORKSPACE.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'invalid_role' });

      validateApiResponse(response, 400);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 403);
    });
  });

  describe('DELETE /api/users/:id/workspaces/:workspaceId', () => {
    it('should remove user from workspace as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Remove testuser1 from workspace 1
      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the user was removed - workspace should not be in the response
      const removedWorkspace = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
      expect(removedWorkspace).toBeUndefined();

      // Restore original state: add testuser1 back as collaborator to workspace 1
      await auth.post(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces`)
        .send({
          workspaceId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'collaborator'
        });
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/users/99999/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/99999`);

      validateApiResponse(response, 404);
    });

    it('should return 404 if user has no access to workspace', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser2 has no access to workspace 3 (SEARCH_WORKSPACE)
      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER2.id}/workspaces/${TEST_WORKSPACES.SEARCH_WORKSPACE.id}`);

      validateApiResponse(response, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/workspaces/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 403);
    });
  });
});
