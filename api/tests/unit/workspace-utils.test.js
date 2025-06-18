/**
 * Workspace Utilities Unit Tests
 * 
 * Tests the workspace utility functions for permission checking.
 */

const {
  canAdmin,
  canWrite,
  canRead,
  getWorkspaceUsers,
  getWorkspaceById
} = require('../../src/utils/workspace');

const { resetDatabase } = require('../utils/test-helpers');

describe('Workspace Utilities', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe('canAdmin', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in workspace 1
      const result = await canAdmin(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in workspace 1
      const result = await canAdmin(1, 2);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in workspace 1
      const result = await canAdmin(1, 3);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to workspace 1
      const result = await canAdmin(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this workspace');
    });
  });

  describe('canWrite', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in workspace 1
      const result = await canWrite(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in workspace 1
      const result = await canWrite(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in workspace 1
      const result = await canWrite(1, 3);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Write access required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to workspace 1
      const result = await canWrite(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this workspace');
    });
  });

  describe('canRead', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in workspace 1
      const result = await canRead(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in workspace 1
      const result = await canRead(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in workspace 1
      const result = await canRead(1, 3);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to workspace 1
      const result = await canRead(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this workspace');
    });
  });

  describe('getWorkspaceUsers', () => {
    it('should return workspace users with roles', async () => {
      // Using test data: workspace 1 has 3 users with different roles
      const result = await getWorkspaceUsers(1);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check that each user has required properties
      result.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('role');
        expect(['admin', 'collaborator', 'viewer']).toContain(user.role);
      });
    });

    it('should return empty array for workspace with no users', async () => {
      // Using test data: workspace 4 has only one user (superadmin)
      // Let's test with a workspace that actually has no users by using workspace ID that doesn't exist in user assignments
      const result = await getWorkspaceUsers(99);

      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceById', () => {
    it('should return workspace when found', async () => {
      // Using test data: workspace 1 exists
      const result = await getWorkspaceById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('created_at');
      expect(result.deleted_at).toBeNull();
    });

    it('should return null for non-existent workspace', async () => {
      // Using test data: workspace 99999 does not exist
      const result = await getWorkspaceById(99999);

      expect(result).toBeNull();
    });

    it('should return null for deleted workspace', async () => {
      // First, let's soft delete workspace 3 by setting its deleted_at
      await require('../../src/db').execute(
        'UPDATE workspace SET deleted_at = NOW() WHERE id = 3'
      );

      const result = await getWorkspaceById(3);

      expect(result).toBeNull();
    });
  });
});
