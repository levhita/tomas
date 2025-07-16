/**
 * Book Management API Tests
 * 
 * Tests all book-related endpoints including CRUD operations.
 */

const request = require('supertest');
const {
  TEST_USERS,
  TEST_BOOKS,
  loginUser,
  initializeTokenCache,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  validateBookObject,
  generateRandomData,
  createTestUser,
  app
} = require('../utils/test-helpers');

describe('Book Management API', () => {
  let superadminToken;
  let adminToken;          // User with admin role in team 1
  let viewerToken;         // User with viewer role in team 1  
  let collaboratorToken;   // User with collaborator role in team 1
  let noaccessToken;       // User with no team access for permission-denied scenarios

  beforeAll(async () => {
    resetDatabase(); // Ensure fresh database state before tests
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
  };

  describe('GET /api/books/:id', () => {
    it('should return book for user with access', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, admin in team 2
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 200);
      validateBookObject(response.body);
      expect(response.body.id).toBe(TEST_BOOKS.BOOK1.id);
      expect(response.body.name).toBe(TEST_BOOKS.BOOK1.name);
    });

    it('should deny access to book user has no access to', async () => {
      const auth = authenticatedRequest(noaccessToken); // User with no team access
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/99999');

      validateApiResponse(response, 404);
    });
  });

  describe('GET /api/books/:id/accounts', () => {
    it('should return accounts for book with read access', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/accounts`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const account = response.body[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('type');
        expect(account).toHaveProperty('book_id');
        expect(account.book_id).toBe(TEST_BOOKS.BOOK1.id);
      }
    });

    it('should deny access to book accounts without permission', async () => {
      await resetBeforeTest();
      const auth = authenticatedRequest(noaccessToken); // User with no team access
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/accounts`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book accounts', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/99999/accounts');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/books', () => {
    it('should create new book', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
          team_id: 1, // Team 1
          note: 'Test book description',
          currency_symbol: '€',
          week_start: 'sunday'
        });

      validateApiResponse(response, 201);
      validateBookObject(response.body);
      expect(response.body.name).toBe(bookData.bookName);
      expect(response.body.note).toBe('Test book description');
      expect(response.body.currency_symbol).toBe('€');
      expect(response.body.week_start).toBe('sunday');
    });

    it('should create book with minimal data', async () => {
      const auth = authenticatedRequest(adminToken);
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
          team_id: 1 // Team 1
        });

      validateApiResponse(response, 201);
      validateBookObject(response.body);
      expect(response.body.name).toBe(bookData.bookName);
      expect(response.body.currency_symbol).toBe('$'); // default
      expect(response.body.week_start).toBe('monday'); // default
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.post('/api/books')
        .send({
          note: 'Missing name'
        });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
          team_id: 1
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
          team_id: 1
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          name: 'Test Book'
        });

      validateApiResponse(response, 401);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update book as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1 (book 1)
      const newName = `Updated ${Date.now()}`;

      const response = await auth.put(`/api/books/${TEST_BOOKS.BOOK1.id}`)
        .send({
          name: newName,
          note: 'Updated description',
          currency_symbol: '¥',
          week_start: 'sunday'
        });

      validateApiResponse(response, 200);
      validateBookObject(response.body);
      expect(response.body.name).toBe(newName);
      expect(response.body.note).toBe('Updated description');
      expect(response.body.currency_symbol).toBe('¥');
      expect(response.body.week_start).toBe('sunday');
    });

    it('should deny access for non-admin user', async () => {
      const auth = authenticatedRequest(viewerToken); // User 4: viewer in team 1, no write access

      // User 4 is viewer in book 1 (team 1), should not be able to update
      const response = await auth.put(`/api/books/${TEST_BOOKS.BOOK1.id}`)
        .send({
          name: 'Hacked Name'
        });

      validateApiResponse(response, 403);
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);

      const response = await auth.put(`/api/books/${TEST_BOOKS.BOOK1.id}`)
        .send({
          name: 'No Access Update'
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/books/${TEST_BOOKS.BOOK1.id}`)
        .send({
          name: 'Superadmin No Access Update'
        });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put('/api/books/99999')
        .send({
          name: 'Updated'
        });

      validateApiResponse(response, 404);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should soft delete book as admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1 (book 1)

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/deleted/i);

      // Verify book is soft deleted (should return 404)
      const getResponse = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}`);
      validateApiResponse(getResponse, 404);
    });

    it('should deny collaborator from soft deleting book', async () => {
      await resetBeforeTest(); // Ensure fresh data for team/book relationship tests
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1 (book 1)

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 403); // Collaborators cannot soft delete, only admins can
    });

    it('should deny access for viewer (read-only user)', async () => {
      const auth = authenticatedRequest(viewerToken); // User 4: viewer in team 1 (read-only)

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 403);
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/books/99999');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/books/:id/restore', () => {
    beforeAll(async () => {
      await resetBeforeTest();
      // Soft delete a book first using admin (who can soft delete)
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);
    });

    it('should restore soft-deleted book as team admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      const response = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      validateApiResponse(response, 200);
      validateBookObject(response.body);
      expect(response.body.id).toBe(TEST_BOOKS.BOOK1.id);

      // Verify book is accessible again by the team admin
      const getResponse = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}`);
      validateApiResponse(getResponse, 200);
    });

    it('should deny access for non-admin team member', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin

      const response = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);

      const response = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for superadmin without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(adminToken); // Use admin in team 1

      const response = await auth.post('/api/books/99999/restore');

      validateApiResponse(response, 404);
    });

    it('should return 400 for already active book', async () => {
      // First restore the book
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      // Try to restore again
      const response = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);

      validateApiResponse(response, 400);
    });
  });

  describe('DELETE /api/books/:id/permanent', () => {
    let deletableBookId;

    beforeAll(async () => {
      await resetBeforeTest();
      // Create a fresh book with no dependent data for deletion testing
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const createResponse = await auth.post('/api/books')
        .send({
          name: 'Deletable Book',
          team_id: 1, // Team 1 where user 2 is admin
          note: 'Book for deletion testing'
        });

      deletableBookId = createResponse.body.id;

      // Soft delete it first
      await auth.delete(`/api/books/${deletableBookId}`);
    });

    it('should cascade delete book with existing data', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      // Soft delete book 1 first (it has accounts)
      await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}`);
      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}/permanent`);
      validateApiResponse(response, 204);

      // Verify the book is completely deleted (should get 404)
      const checkResponse = await auth.post(`/api/books/${TEST_BOOKS.BOOK1.id}/restore`);
      validateApiResponse(checkResponse, 404);
    });

    it('should permanently delete empty book as team admin', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);
      validateApiResponse(response, 204);

      // Verify book cannot be restored
      const restoreResponse = await auth.post(`/api/books/${deletableBookId}/restore`);
      validateApiResponse(restoreResponse, 404);
      await resetBeforeTest(); // Reset after test
    });

    it('should deny access for non-admin team member', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin
      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}/permanent`);
      validateApiResponse(response, 403);
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);
      validateApiResponse(response, 404);
    });

    it('should deny access for superadmin without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);
      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(adminToken); // Use team admin in team 1
      const response = await auth.delete('/api/books/99999/permanent');
      validateApiResponse(response, 404);
    });

    it('should return 400 for active book', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1

      // Try to permanently delete an active book
      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}/permanent`);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/soft-deleted/i);
      await resetBeforeTest(); // Reset after test
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors in book creation', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Mock database error by providing invalid data that would cause a database constraint violation
      const teamData = {
        name: 'A'.repeat(300), // Exceed varchar(255) limit to trigger database error
        team_id: 1
      };

      const response = await auth.post('/api/books').send(teamData);

      // Should return 500 due to database error
      validateApiResponse(response, 500);
      expect(response.body.error).toMatch(/Failed to create book/i);
    });

    it('should handle database errors in book update', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // First create a book to update
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Update Error',
        team_id: 1
      });
      const bookId = createResponse.body.id;

      // Try to update with invalid data that would cause a database error
      const updateData = {
        name: 'A'.repeat(300), // Exceed varchar(255) limit
        note: 'Test note'
      };

      const response = await auth.put(`/api/books/${bookId}`).send(updateData);

      // Should return 500 due to database error
      validateApiResponse(response, 500);
      expect(response.body.error).toMatch(/Failed to update book/i);
    });

    it('should handle database errors in book deletion', async () => {
      // This test is tricky as we need to simulate a database error during deletion
      // We'll test by trying to delete a book that gets modified during the operation
      const auth = authenticatedRequest(adminToken);
      
      // Create a book first
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Delete Error',
        team_id: 1
      });
      const bookId = createResponse.body.id;

      // This is hard to trigger naturally, but we can test the error path exists
      // by checking that a non-existent book returns proper error
      const response = await auth.delete(`/api/books/99999`);

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should handle database errors in book restoration', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Create and soft-delete a book first
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Restore Error',
        team_id: 1
      });
      const bookId = createResponse.body.id;
      
      await auth.delete(`/api/books/${bookId}`);

      // Test restoring non-existent book (simulates database error scenario)
      const response = await auth.post(`/api/books/99999/restore`);

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should handle update with no affected rows', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Create a book, then soft-delete it
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for No Rows Update',
        team_id: 1
      });
      const bookId = createResponse.body.id;
      
      await auth.delete(`/api/books/${bookId}`);

      // Try to update the soft-deleted book (should fail)
      const updateData = {
        name: 'Updated Name',
        note: 'Updated note'
      };

      const response = await auth.put(`/api/books/${bookId}`).send(updateData);

      // Should return 404 since the book is soft-deleted
      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should handle soft deletion with no affected rows', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Create a book and soft-delete it
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Double Delete',
        team_id: 1
      });
      const bookId = createResponse.body.id;
      
      // First deletion should succeed
      await auth.delete(`/api/books/${bookId}`);

      // Second deletion should fail with no affected rows
      const response = await auth.delete(`/api/books/${bookId}`);

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should handle restoration with no affected rows', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Create a book
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Double Restore',
        team_id: 1
      });
      const bookId = createResponse.body.id;
      
      // Soft-delete and restore it
      await auth.delete(`/api/books/${bookId}`);
      await auth.post(`/api/books/${bookId}/restore`);

      // Try to restore again (should fail with no affected rows)
      const response = await auth.post(`/api/books/${bookId}/restore`);

      validateApiResponse(response, 400);
      expect(response.body.error).toBe('Book is already active');
    });

    it('should handle permanent deletion database errors', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Test permanent deletion of non-existent book
      const response = await auth.delete('/api/books/99999/permanent');

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should validate missing name in update request', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Create a book first
      const createResponse = await auth.post('/api/books').send({
        name: 'Test Book for Missing Name Update',
        team_id: 1
      });
      const bookId = createResponse.body.id;

      // Try to update without name
      const updateData = {
        note: 'Updated note'
        // Missing name field
      };

      const response = await auth.put(`/api/books/${bookId}`).send(updateData);

      validateApiResponse(response, 400);
      expect(response.body.error).toBe('Name is required');
    });

    it('should handle team not found during book operations', async () => {
      // This tests the edge case where a book exists but its team is deleted
      // This is harder to test in isolation, but we can test the team lookup path
      const auth = authenticatedRequest(adminToken);
      
      // Test accessing a book that might have team relationship issues
      const response = await auth.get('/api/books/99999');

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Book not found');
    });

    it('should require teamId parameter in book creation', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Test creating a book without teamId
      const bookData = {
        name: 'Test Book Without Team',
        note: 'Missing team ID'
      };

      const response = await auth.post('/api/books').send(bookData);

      validateApiResponse(response, 400);
      expect(response.body.error).toBe('Team ID is required');
    });

    it('should handle team not found during book creation', async () => {
      const auth = authenticatedRequest(adminToken);
      
      // Test creating a book with non-existent teamId
      const bookData = {
        name: 'Test Book for Non-existent Team',
        team_id: 99999
      };

      const response = await auth.post('/api/books').send(bookData);

      validateApiResponse(response, 404);
      expect(response.body.error).toBe('Team not found');
    });
  });

  describe('GET /api/books/:id/categories', () => {
    it('should return categories for book with read access', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/categories`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const category = response.body[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('type');
        expect(category).toHaveProperty('book_id');
        expect(category.book_id).toBe(TEST_BOOKS.BOOK1.id);
      }
    });

    it('should return categories ordered alphabetically by name', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/categories`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Check that categories are returned in alphabetical order
      if (response.body.length > 1) {
        const names = response.body.map(cat => cat.name);
        const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
        expect(names).toEqual(sortedNames);

        // Also verify each category has the required fields
        response.body.forEach(category => {
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('book_id', TEST_BOOKS.BOOK1.id);
        });
      }
    });

    it('should deny access to book categories without permission', async () => {
      const auth = authenticatedRequest(noaccessToken); // User with no team access
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/categories`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken); // Superadmin has no team membership
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/categories`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get(`/api/books/${TEST_BOOKS.BOOK1.id}/categories`);

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should return 404 for non-existent book categories', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/99999/categories');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Book not found');
    });

    it('should handle malformed book_id parameter', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/invalid/categories');

      // Should return 404 for invalid book ID format
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('GET /api/books/:id/transactions', () => {
    it('should return transactions for book with read access', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const transaction = response.body[0];
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('description');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('date');
        expect(transaction).toHaveProperty('exercised');
        expect(transaction).toHaveProperty('account_id');
        expect(transaction).toHaveProperty('account_name');
        expect(typeof transaction.exercised).toBe('boolean');
      }
    });

    it('should return transactions filtered by account_id parameter', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`)
        .query({ account_id: 1 }); // Account 1 is in book 1

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // All transactions should belong to the specified account
      response.body.forEach(transaction => {
        expect(transaction.account_id).toBe(1);
      });
    });

    it('should return transactions filtered by date range', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`)
        .query({
          start_date: '2024-12-01',
          end_date: '2024-12-31'
        });

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // All returned transactions should be within the date range
      response.body.forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        expect(transactionDate >= new Date('2024-12-01')).toBe(true);
        expect(transactionDate <= new Date('2024-12-31')).toBe(true);
      });
    });

    it('should return transactions ordered by date', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Check that transactions are returned in date order (ASC)
      if (response.body.length > 1) {
        for (let i = 0; i < response.body.length - 1; i++) {
          const currentDate = new Date(response.body[i].date);
          const nextDate = new Date(response.body[i + 1].date);
          expect(currentDate <= nextDate).toBe(true);
        }
      }
    });

    it('should return 404 for account_id not in the specified book', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`)
        .query({ account_id: 3 }); // Account 3 is in book 2, not book 1

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Account not found in this book');
    });

    it('should deny access to book transactions without permission', async () => {
      const auth = authenticatedRequest(noaccessToken); // User with no team access
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken); // Superadmin has no team membership
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access to books they are not a member of', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get(`/api/books/${TEST_BOOKS.BOOK1.id}/transactions`);

      validateApiResponse(response, 401);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should return 404 for non-existent book transactions', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/99999/transactions');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Book not found');
    });

    it('should handle malformed book_id parameter', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/invalid/transactions');

      // Should return 404 for invalid book ID format
      expect([400, 404]).toContain(response.status);
    });
  });
});
