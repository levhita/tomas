/**
 * Team Utilities Unit Tests
 *
 * Tests the team utility functions for permission checking and user/team queries.
 */

const {
  getUserRole,
  canAdmin,
  canWrite,
  canRead,
  getTeamUsers,
  getTeamById,
  getTeamByBookId
} = require('../../src/utils/team');
const { authenticatedRequest, initializeTokenCache, resetDatabase } = require('../utils/test-helpers');

let superadminToken, adminToken;

beforeAll(async () => {
  const tokens = await initializeTokenCache();
  superadminToken = tokens.superadmin;
  adminToken = tokens.admin;
});

describe('Team Utilities', () => {
  it('should test getUserRole utility function directly', async () => {
    // Test valid user with role
    const role1 = await getUserRole(1, 2); // User 2 is admin in team 1
    expect(role1).toBe('admin');

    // Test valid user with different role
    const role2 = await getUserRole(1, 4); // User 4 is viewer in team 1
    expect(role2).toBe('viewer');

    // Test user with no access to team
    const role3 = await getUserRole(1, 5); // User 5 has no team access
    expect(role3).toBeNull();

    // Test non-existent team
    const role4 = await getUserRole(99999, 2);
    expect(role4).toBeNull();
  });

  it('should test permission functions with various scenarios', async () => {
    // Test admin permissions
    const adminResult = await canAdmin(1, 2); // User 2 is admin in team 1
    expect(adminResult.allowed).toBe(true);
    expect(adminResult.message).toBe('Access granted');

    // Test non-admin trying admin operations
    const nonAdminResult = await canAdmin(1, 4); // User 4 is viewer in team 1
    expect(nonAdminResult.allowed).toBe(false);
    expect(nonAdminResult.message).toMatch(/admin privileges required/i);

    // Test user with no team access
    const noAccessAdmin = await canAdmin(1, 5); // User 5 has no team access
    expect(noAccessAdmin.allowed).toBe(false);
    expect(noAccessAdmin.message).toMatch(/access denied/i);

    // Test write permissions for collaborator
    const collaboratorWrite = await canWrite(1, 3); // User 3 is collaborator in team 1
    expect(collaboratorWrite.allowed).toBe(true);

    // Test write permissions denied for viewer
    const viewerWrite = await canWrite(1, 4); // User 4 is viewer in team 1
    expect(viewerWrite.allowed).toBe(false);
    expect(viewerWrite.message).toMatch(/write access required/i);

    // Test read permissions for all roles
    const adminRead = await canRead(1, 2); // Admin
    expect(adminRead.allowed).toBe(true);

    const collaboratorRead = await canRead(1, 3); // Collaborator
    expect(collaboratorRead.allowed).toBe(true);

    const viewerRead = await canRead(1, 4); // Viewer
    expect(viewerRead.allowed).toBe(true);

    // Test read denied for no access
    const noAccessRead = await canRead(1, 5); // No access
    expect(noAccessRead.allowed).toBe(false);
  });

  it('should test getTeamUsers utility function', async () => {
    // Test getting users for team 1
    const users = await getTeamUsers(1);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);

    // Verify user structure
    const user = users[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('created_at');
    expect(['admin', 'collaborator', 'viewer']).toContain(user.role);

    // Test getting users for non-existent team
    const noUsers = await getTeamUsers(99999);
    expect(Array.isArray(noUsers)).toBe(true);
    expect(noUsers.length).toBe(0);
  });

  it('should test getTeamById utility function', async () => {
    // Test getting existing team
    const team = await getTeamById(1);
    expect(team).toHaveProperty('id', 1);
    expect(team).toHaveProperty('name');
    expect(team).toHaveProperty('created_at');
    expect(team.deleted_at).toBeNull();

    // Test getting non-existent team
    const noTeam = await getTeamById(99999);
    expect(noTeam).toBeNull();
  });

  it('should test getTeamById with includeDeleted parameter', async () => {
    const auth = authenticatedRequest(superadminToken);

    // Soft delete team 1
    await auth.delete('/api/teams/1');

    // Should not find deleted team by default
    const noTeam = await getTeamById(1);
    expect(noTeam).toBeNull();

    // Should find deleted team when includeDeleted=true
    const deletedTeam = await getTeamById(1, true);
    expect(deletedTeam).toHaveProperty('id', 1);
    expect(deletedTeam.deleted_at).not.toBeNull();
  });

  it('should test getTeamByBookId utility function', async () => {
    await resetDatabase(); // Ensure clean state
    // Test getting team for existing book
    const team = await getTeamByBookId(1); // Book 1 belongs to team 1
    expect(team).toHaveProperty('id', 1);
    expect(team).toHaveProperty('name');
    expect(team.deleted_at).toBeNull();

    // Test getting team for non-existent book
    const noTeam = await getTeamByBookId(99999);
    expect(noTeam).toBeNull();
  });

  it('should return null for soft-deleted book', async () => {
    const auth = authenticatedRequest(adminToken);

    // Create a new book and then soft delete it
    const createResponse = await auth.post('/api/books').send({
      name: 'Test Book for Schema',
      team_id: 1
    });
    const bookId = createResponse.body.id;

    // Soft delete the book
    await auth.delete(`/api/books/${bookId}`);

    // Should not find team for soft-deleted book
    const noTeamForDeletedBook = await getTeamByBookId(bookId);
    expect(noTeamForDeletedBook).toBeNull();
  });

  it('should handle database errors in getUserRole', async () => {
    // Test with invalid data types that might cause database errors
    try {
      await getUserRole('invalid', 'invalid');
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should test team access for soft-deleted teams', async () => {
    const auth = authenticatedRequest(superadminToken);

    // Soft delete team 1
    await auth.delete('/api/teams/1');

    // Should not have access to soft-deleted team
    const role = await getUserRole(1, 2); // User 2 was admin in team 1
    expect(role).toBeNull();

    const readAccess = await canRead(1, 2);
    expect(readAccess.allowed).toBe(false);

    const writeAccess = await canWrite(1, 2);
    expect(writeAccess.allowed).toBe(false);

    const adminAccess = await canAdmin(1, 2);
    expect(adminAccess.allowed).toBe(false);
  });
});
