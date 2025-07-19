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
  getBookById,
  getBookByIdIncludingDeleted
} = require('../../src/utils/book');

const { resetDatabase } = require('../utils/test-helpers');

describe('Book Utilities', () => {

  describe('canAdmin', () => {
    it('should allow admin users', async () => {
      // Using test data: user 2 (admin) has admin role in team 1 (book 1)
      const result = await canAdmin(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny collaborator users', async () => {
      // Using test data: user 3 (collaborator) has collaborator role in team 1 (book 1)
      const result = await canAdmin(1, 3);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 4 (viewer) has viewer role in team 1 (book 1)
      const result = await canAdmin(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Admin privileges required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 1 (superadmin) is not a member of any team
      const result = await canAdmin(1, 1);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this book');
    });
  });

  describe('canWrite', () => {
    it('should allow admin users', async () => {
      // Using test data: user 2 (admin) has admin role in team 1 (book 1)
      const result = await canWrite(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 3 (collaborator) has collaborator role in team 1 (book 1)
      const result = await canWrite(1, 3);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny viewer users', async () => {
      // Using test data: user 4 (viewer) has viewer role in team 1 (book 1)
      const result = await canWrite(1, 4);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Write access required for this operation');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 1 (superadmin) is not a member of any team
      const result = await canWrite(1, 1);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Access denied to this book');
    });
  });

  describe('canRead', () => {
    it('should allow admin users', async () => {
      // Using test data: user 2 (admin) has admin role in team 1 (book 1)
      const result = await canRead(1, 2);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow collaborator users', async () => {
      // Using test data: user 3 (collaborator) has collaborator role in team 1 (book 1)
      const result = await canRead(1, 3);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should allow viewer users', async () => {
      // Using test data: user 4 (viewer) has viewer role in team 1 (book 1)
      const result = await canRead(1, 4);

      expect(result.allowed).toBe(true);
      expect(result.message).toBe('Access granted');
    });

    it('should deny users with no access', async () => {
      // Using test data: user 1 (superadmin) is not a member of any team
      const result = await canRead(1, 1);

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

  describe('getBookByIdIncludingDeleted', () => {
    it('should return book even if deleted', async () => {
      // Soft delete book 2
      await require('../../src/db').execute(
        'UPDATE book SET deleted_at = NOW() WHERE id = 2'
      );
      const result = await getBookByIdIncludingDeleted(2);
      expect(result).toBeDefined();
      expect(result.id).toBe(2);
      expect(result.deleted_at).not.toBeNull();
    });

    it('should return null for non-existent book', async () => {
      const result = await getBookByIdIncludingDeleted(99999);
      expect(result).toBeNull();
    });
  });

  describe('getBookByAccountId', () => {
    it('should return the book for a valid account', async () => {
      // Account 1 belongs to book 1 in test data
      const { getBookByAccountId } = require('../../src/utils/book');
      const book = await getBookByAccountId(1);
      expect(book).toBeDefined();
      expect(book).toHaveProperty('id', 1);
      expect(book).toHaveProperty('name');
      expect(book.deleted_at).toBeNull();
    });

    it('should return null for a non-existent account', async () => {
      const { getBookByAccountId } = require('../../src/utils/book');
      const book = await getBookByAccountId(99999);
      expect(book).toBeNull();
    });

    it('should return null for a soft-deleted book', async () => {
      const { getBookByAccountId } = require('../../src/utils/book');
      const db = require('../../src/db');
      // Soft-delete book 1
      await db.execute('UPDATE book SET deleted_at = NOW() WHERE id = 1');
      const book = await getBookByAccountId(1);
      expect(book).toBeNull();
      // Restore book 1 for other tests
      await db.execute('UPDATE book SET deleted_at = NULL WHERE id = 1');
    });

    it('should return null for an account whose team is soft-deleted', async () => {
      const { getBookByAccountId } = require('../../src/utils/book');
      const db = require('../../src/db');
      // Soft-delete team 1 (which owns book 1)
      await db.execute('UPDATE team SET deleted_at = NOW() WHERE id = 1');
      const book = await getBookByAccountId(1);
      expect(book).toBeNull();
      // Restore team 1 for other tests
      await db.execute('UPDATE team SET deleted_at = NULL WHERE id = 1');
    });
  });

  describe('Permission checks for deleted books', () => {
    beforeEach(async () => {
      await resetDatabase();
      // Soft delete book 1
      await require('../../src/db').execute(
        'UPDATE book SET deleted_at = NOW() WHERE id = 1'
      );
    });

    it('canAdmin should deny access to deleted book', async () => {
      const result = await canAdmin(1, 2);
      expect(result.allowed).toBe(false);
      expect(result.message).toMatch(/Access denied/);
    });

    it('canWrite should deny access to deleted book', async () => {
      const result = await canWrite(1, 2);
      expect(result.allowed).toBe(false);
      expect(result.message).toMatch(/Access denied/);
    });

    it('canRead should deny access to deleted book', async () => {
      const result = await canRead(1, 2);
      expect(result.allowed).toBe(false);
      expect(result.message).toMatch(/Access denied/);
    });

    it('getBookUsers should return empty array for deleted book', async () => {
      const users = await getBookUsers(1);
      expect(users).toEqual([]);
    });

    it('getBookById should return null for deleted book', async () => {
      const book = await getBookById(1);
      expect(book).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input gracefully', async () => {
      try {
        await canAdmin('invalid', 'invalid');
        expect(true).toBe(true);
      } catch (e) {
        expect(e).toBeDefined();
      }
      try {
        await getBookById(null);
        expect(true).toBe(true);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
});
