/**
 * Teams API Tests
 * 
 * Tests all team-related endpoints including CRUD operations,
 * user management, and role assignment functionality.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  initializeTokenCache,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  generateRandomData,
  createTestUser,
  app
} = require('../utils/test-helpers');

describe('Teams Management API', () => {
  let superadminToken;
  let adminToken;          // User with admin role in team 1
  let viewerToken;         // User with viewer role in team 1  
  let collaboratorToken;   // User with collaborator role in team 1
  let noaccessToken;       // User with no team access for permission-denied scenarios

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;           // User 2: admin in team 1, viewer in team 2
    viewerToken = tokens.viewer;         // User 4: viewer in team 1, collaborator in team 2
    collaboratorToken = tokens.collaborator; // User 3: collaborator in team 1, admin in team 2
    noaccessToken = tokens.noaccess;     // User 5: no team access
  });

  // Reset database only before tests that modify data or create conflicts
  const resetBeforeTest = async () => {
    await resetDatabase();
    // Tokens should still be valid, but get them from cache or re-initialize if needed
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;
    viewerToken = tokens.viewer;
    collaboratorToken = tokens.collaborator;
    noaccessToken = tokens.noaccess;
  };

  describe('GET /api/teams', () => {
    it('should return user teams for authenticated user', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1, viewer in team 2
      const response = await auth.get('/api/teams');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check team structure
      const team = response.body[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('role');
      expect(['viewer', 'collaborator', 'admin']).toContain(team.role);
    });

    it('should return empty array for user with no teams', async () => {
      // Create a new user with no team access
      const userData = generateRandomData();
      const newUser = await createTestUser({
        username: userData.username,
        password: userData.password
      }, superadminToken);

      // Get token for the new user
      const newUserToken = await loginUser({
        username: userData.username,
        password: userData.password,
        id: newUser.id
      });

      const newUserAuth = authenticatedRequest(newUserToken);
      const response = await newUserAuth.get('/api/teams');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/teams');

      validateApiResponse(response, 401);
    });

    it('should support team creation and user management', async () => {
      // This test validates the team-books integration workflow:
      // 1. Create a new team without books
      // 2. Add a user to the team  
      // 3. Verify the user can access the team's books (empty list)

      const auth = authenticatedRequest(superadminToken);
      const teamResponse = await auth.post('/api/teams')
        .send({
          name: 'Empty Team for Books Test'
        });

      const teamId = teamResponse.body.id;

      // Add the collaborator user to this new team
      await auth.post(`/api/teams/${teamId}/users`)
        .send({
          userId: 3, // collaborator user
          role: 'viewer'
        });

      // Now test with the collaborator - verify they can access books for this team
      const userAuth = authenticatedRequest(collaboratorToken);
      const response = await userAuth.get(`/api/books?teamId=${teamId}`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0); // New team has no books yet
    });
  });

  describe('GET /api/teams/all', () => {
    it('should return all teams for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/teams/all');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that all test teams are included
      const teamIds = response.body.map(t => t.id);
      expect(teamIds).toContain(1); // Team 1
      expect(teamIds).toContain(2); // Team 2

      // Verify structure
      response.body.forEach(team => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
        expect(team).toHaveProperty('created_at');
      });
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/teams/all');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin privileges required/i);
    });
  });

  describe('GET /api/teams/search', () => {
    it('should search teams by name for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/teams/search?q=Test&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all results contain "Test" in name
      response.body.forEach(team => {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('name');
        expect(team.name.toLowerCase()).toContain('test');
      });
    });

    it('should limit search results', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/teams/search?q=Team&limit=1');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for no matches', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/teams/search?q=NonExistentTeam&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/teams/search?q=Test&limit=10');

      validateApiResponse(response, 403);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team for user with access', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get('/api/teams/1');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should deny access to team user has no access to', async () => {
      // Create a new team that existing users don't have access to
      const auth = authenticatedRequest(noaccessToken);
      const teamData = {
        name: `Isolated Team ${Date.now()}`
      };

      const createResponse = await auth.post('/api/teams').send(teamData);
      const isolatedTeamId = createResponse.body.id;

      // Try to access with a user who's not a member
      const viewerAuth = authenticatedRequest(viewerToken);
      const response = await viewerAuth.get(`/api/teams/${isolatedTeamId}`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent team', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/teams/99999');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/teams', () => {
    beforeEach(resetBeforeTest);

    it('should create new team', async () => {
      const auth = authenticatedRequest(adminToken);
      const teamData = {
        name: `Test Team ${Date.now()}`
      };

      const response = await auth.post('/api/teams').send(teamData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(teamData.name);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should create team with minimal data', async () => {
      const auth = authenticatedRequest(adminToken);
      const teamData = {
        name: `Minimal Team ${Date.now()}`
      };

      const response = await auth.post('/api/teams').send(teamData);

      validateApiResponse(response, 201);
      expect(response.body.name).toBe(teamData.name);
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.post('/api/teams')
        .send({
          note: 'Missing name'
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({
          name: 'Test Team'
        });

      validateApiResponse(response, 401);
    });
  });

  describe('PUT /api/teams/:id', () => {
    beforeEach(resetBeforeTest);

    it('should update team as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const newName = `Updated Team ${Date.now()}`;

      const response = await auth.put('/api/teams/1')
        .send({
          name: newName
        });

      validateApiResponse(response, 200);
      expect(response.body.name).toBe(newName);
    });

    it('should deny access for non-admin user', async () => {
      const auth = authenticatedRequest(viewerToken); // User 4: viewer in team 1

      const response = await auth.put('/api/teams/1')
        .send({
          name: 'Hacked Name'
        });

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent team', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put('/api/teams/99999')
        .send({
          name: 'Updated'
        });

      validateApiResponse(response, 404);
    });
  });

  describe('GET /api/teams/:id/users', () => {
    it('should return team users for admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      const response = await auth.get('/api/teams/1/users');

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

    it('should return team users for collaborator', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1

      const response = await auth.get('/api/teams/1/users');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access for non-member', async () => {
      // Create a new team that viewerToken doesn't have access to
      const auth = authenticatedRequest(superadminToken);
      const teamData = {
        name: `Isolated Team ${Date.now()}`
      };

      const createResponse = await auth.post('/api/teams').send(teamData);
      const isolatedTeamId = createResponse.body.id;

      const viewerAuth = authenticatedRequest(viewerToken);
      const response = await viewerAuth.get(`/api/teams/${isolatedTeamId}/users`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent team', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/teams/99999/users');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/teams/:id/users', () => {
    beforeEach(resetBeforeTest);

    it('should add user to team as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const userData = {
        userId: TEST_USERS.VIEWER.id, // User 4 (we'll remove and re-add them)
        role: 'collaborator'
      };

      // First remove user 4 from team 1 to test adding
      await auth.delete(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`);

      const response = await auth.post('/api/teams/1/users')
        .send(userData);

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify user was added
      const usersResponse = await auth.get('/api/teams/1/users');
      const addedUser = usersResponse.body.find(u => u.id === userData.userId);
      expect(addedUser).toBeDefined();
      expect(addedUser.role).toBe(userData.role);
    });

    it('should add user with different roles', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
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

        const response = await auth.post('/api/teams/1/users')
          .send(userData);

        validateApiResponse(response, 201);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin
      const userData = {
        userId: TEST_USERS.VIEWER.id,
        role: 'viewer'
      };

      const response = await auth.post('/api/teams/1/users')
        .send(userData);

      validateApiResponse(response, 403);
    });

    it('should return 409 for user already in team', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const userData = {
        userId: TEST_USERS.COLLABORATOR.id, // User 3: already in team 1
        role: 'viewer'
      };

      const response = await auth.post('/api/teams/1/users')
        .send(userData);

      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/already/i);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminToken);
      const userData = {
        userId: 99999,
        role: 'viewer'
      };

      const response = await auth.post('/api/teams/1/users')
        .send(userData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminToken);
      const userData = {
        userId: TEST_USERS.VIEWER.id,
        role: 'invalid_role'
      };

      const response = await auth.post('/api/teams/1/users')
        .send(userData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });
  });

  describe('PUT /api/teams/:id/users/:userId', () => {
    beforeEach(resetBeforeTest);

    it('should update user role as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role was updated
      const updatedUser = response.body.find(u => u.id === TEST_USERS.VIEWER.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.role).toBe(updateData.role);
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`)
        .send(updateData);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminToken);
      const updateData = { role: 'admin' };

      const response = await auth.put('/api/teams/1/users/99999')
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminToken);
      const updateData = { role: 'invalid_role' };

      const response = await auth.put(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`)
        .send(updateData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });
  });

  describe('DELETE /api/teams/:id/users/:userId', () => {
    beforeEach(resetBeforeTest);

    it('should remove user from team as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      const response = await auth.delete(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`);

      validateApiResponse(response, 204);

      // Verify user was removed
      const usersResponse = await auth.get('/api/teams/1/users');
      const removedUser = usersResponse.body.find(u => u.id === TEST_USERS.VIEWER.id);
      expect(removedUser).toBeUndefined();
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin

      const response = await auth.delete(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.delete('/api/teams/1/users/99999');

      validateApiResponse(response, 404);
    });

    it('should prevent removing last admin for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      // Try to remove self (last admin) from team 1
      const response = await auth.delete(`/api/teams/1/users/${TEST_USERS.ADMIN.id}`);

      // This should be prevented with 409 Conflict for non-superadmin
      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/last admin/i);
    });

    it('should allow superadmin to remove last admin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // Superadmin should be able to remove the last admin from team 1
      const response = await superAuth.delete(`/api/teams/1/users/${TEST_USERS.ADMIN.id}`);

      // This should succeed for superadmin
      validateApiResponse(response, 204);
    });

    it('should remove user from team as superadmin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // Remove user 4 (viewer) from team 1
      const response = await superAuth.delete(`/api/teams/1/users/${TEST_USERS.VIEWER.id}`);

      validateApiResponse(response, 204);

      // Verify user was removed
      const usersResponse = await superAuth.get('/api/teams/1/users');
      const removedUser = usersResponse.body.find(u => u.id === TEST_USERS.VIEWER.id);
      expect(removedUser).toBeUndefined();
    });
  });

  describe('Team Deletion Management', () => {
    describe('DELETE /api/teams/:id - Soft Delete', () => {
      beforeEach(async () => {
        await resetBeforeTest(); // Reset for clean state
      });

      it('should allow team admin to soft-delete their team', async () => {
        const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

        const response = await auth.delete('/api/teams/1');
        validateApiResponse(response, 204);

        // Verify team is soft-deleted
        const teamResponse = await auth.get('/api/teams/1');
        validateApiResponse(teamResponse, 404);

        // Verify team no longer appears in user's teams list
        const teamsResponse = await auth.get('/api/teams');
        const deletedTeam = teamsResponse.body.find(t => t.id === 1);
        expect(deletedTeam).toBeUndefined();
      });

      it('should allow superadmin to soft-delete any team', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.delete('/api/teams/2');
        validateApiResponse(response, 204);

        // Verify team is soft-deleted
        const teamResponse = await auth.get('/api/teams/2');
        validateApiResponse(teamResponse, 404);
      });

      it('should deny collaborator from soft-deleting team', async () => {
        const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1

        const response = await auth.delete('/api/teams/1');
        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges required/i);
      });

      it('should deny viewer from soft-deleting team', async () => {
        const auth = authenticatedRequest(viewerToken); // User 4: viewer in team 1

        const response = await auth.delete('/api/teams/1');
        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges required/i);
      });

      it('should return 404 for non-existent team', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.delete('/api/teams/99999');
        validateApiResponse(response, 404);
      });

      it('should return 404 when trying to soft-delete already deleted team', async () => {
        const auth = authenticatedRequest(adminToken);

        // First soft-delete
        await auth.delete('/api/teams/1');

        // Try to soft-delete again
        const response = await auth.delete('/api/teams/1');
        validateApiResponse(response, 404);
      });
    });

    describe('POST /api/teams/:id/restore - Restore Soft-deleted Team', () => {
      beforeEach(async () => {
        await resetBeforeTest();
        // Soft-delete team 1 for testing restore
        const auth = authenticatedRequest(superadminToken);
        await auth.delete('/api/teams/1');
      });

      it('should allow superadmin to restore soft-deleted team', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.post('/api/teams/1/restore');
        validateApiResponse(response, 200);
        expect(response.body).toHaveProperty('id', 1);
        expect(response.body).toHaveProperty('name');
        expect(response.body.deleted_at).toBeNull();

        // Verify team is accessible again
        const teamResponse = await auth.get('/api/teams/1');
        validateApiResponse(teamResponse, 200);
      });

      it('should deny non-superadmin from restoring team', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.post('/api/teams/1/restore');
        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges required/i);
      });

      it('should return 404 for non-existent team', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.post('/api/teams/99999/restore');
        validateApiResponse(response, 404);
      });

      it('should return 400 when trying to restore non-deleted team', async () => {
        await resetBeforeTest(); // Reset to get non-deleted state
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.post('/api/teams/1/restore');
        validateApiResponse(response, 400);
        expect(response.body.error).toMatch(/not deleted/i);
      });
    });

    describe('DELETE /api/teams/:id/permanent - Permanent Delete', () => {
      beforeEach(async () => {
        await resetBeforeTest();
      });

      it('should allow superadmin to permanently delete team', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.delete('/api/teams/1/permanent');
        validateApiResponse(response, 204);

        // Verify team is completely gone
        const teamResponse = await auth.get('/api/teams/1');
        validateApiResponse(teamResponse, 404);

        // Verify with includeDeleted flag in search (should still not find it)
        const searchResponse = await auth.get('/api/teams/search?includeDeleted=true&q=Test Team 1');
        const deletedTeam = searchResponse.body.find(t => t.id === 1);
        expect(deletedTeam).toBeUndefined();
      });

      it('should permanently delete soft-deleted team', async () => {
        const auth = authenticatedRequest(superadminToken);

        // First soft-delete the team
        await auth.delete('/api/teams/1');

        // Then permanently delete
        const response = await auth.delete('/api/teams/1/permanent');
        validateApiResponse(response, 204);

        // Verify team is completely gone
        const teamResponse = await auth.get('/api/teams/1');
        validateApiResponse(teamResponse, 404);
      });

      it('should deny non-superadmin from permanent deletion', async () => {
        const auth = authenticatedRequest(adminToken);

        const response = await auth.delete('/api/teams/1/permanent');
        validateApiResponse(response, 403);
        expect(response.body.error).toMatch(/admin privileges required/i);
      });

      it('should return 404 for non-existent team', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.delete('/api/teams/99999/permanent');
        validateApiResponse(response, 404);
      });
    });

    describe('Search with deleted teams', () => {
      beforeEach(async () => {
        await resetBeforeTest();
        // Soft-delete team 1 for testing
        const auth = authenticatedRequest(superadminToken);
        await auth.delete('/api/teams/1');
      });

      it('should exclude soft-deleted teams by default in search', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.get('/api/teams/search?q=Test');
        const deletedTeam = response.body.find(t => t.id === 1);
        expect(deletedTeam).toBeUndefined();
      });

      it('should include soft-deleted teams when requested', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.get('/api/teams/search?q=Test&includeDeleted=true');
        const deletedTeam = response.body.find(t => t.id === 1);
        expect(deletedTeam).toBeDefined();
        expect(deletedTeam.deleted_at).not.toBeNull();
      });

      it('should exclude soft-deleted teams in /all endpoint', async () => {
        const auth = authenticatedRequest(superadminToken);

        const response = await auth.get('/api/teams/all');
        const deletedTeam = response.body.find(t => t.id === 1);
        expect(deletedTeam).toBeUndefined();
      });
    });
  });
});
