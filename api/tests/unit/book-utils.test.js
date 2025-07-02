/**
 * Book Utilities Unit Tests
 * 
 * Tests the book utility functions for permission checking.
 */

const {
  canAdmin,
  canWrite,
  canRead,
  getBookUsers,
  getBookById
} = require('../../src/utils/book');

const { resetDatabase } = require('../utils/test-helpers');

describe('Book Utilities', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe('canAdmin', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in book 1
      const result = await canAdmin(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in book 1
      const result = await canAdmin(1, 2);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in book 1
      const result = await canAdmin(1, 3);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to book 1
      const result = await canAdmin(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this book');
    });
  });

  describe('canWrite', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in book 1
      const result = await canWrite(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in book 1
      const result = await canWrite(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in book 1
      const result = await canWrite(1, 3);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Write access required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to book 1
      const result = await canWrite(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this book');
    });
  });

  describe('canRead', () => {
    it('should allow admin users', async () => {
      // Using test data: user 1 (superadmin) has admin role in book 1
      const result = await canRead(1, 1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 2 (testuser1) has collaborator role in book 1
      const result = await canRead(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow viewer users', async () => {
      // Using test data: user 3 (testuser2) has viewer role in book 1
      const result = await canRead(1, 3);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 4 (regularuser) has no access to book 1
      const result = await canRead(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this book');
    });
  });

  describe('getBookUsers', () => {
    it('should return book users with roles', async () => {
      // Using test data: book 1 has 3 users with different roles
      const result = await getBookUsers(1);

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

    it('should return empty array for book with no users', async () => {
      // Using test data: book 4 has only one user (superadmin)
      // Let's test with a book that actually has no users by using book ID that doesn't exist in user assignments
      const result = await getBookUsers(99);

      expect(result).toEqual([]);
    });
  });

  describe('getBookById', () => {
    it('should return book when found', async () => {
      // Using test data: book 1 exists
      const result = await getBookById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('note');
      expect(result).toHaveProperty('created_at');
      expect(result.deleted_at).toBeNull();
    });

    it('should return null for non-existent book', async () => {
      // Using test data: book 99999 does not exist
      const result = await getBookById(99999);

      expect(result).toBeNull();
    });

    it('should return null for deleted book', async () => {
      // First, let's soft delete book 3 by setting its deleted_at
      await require('../../src/db').execute(
        'UPDATE book SET deleted_at = NOW() WHERE id = 3'
      );

      const result = await getBookById(3);

      expect(result).toBeNull();
    });
  });
});
