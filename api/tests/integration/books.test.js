/**
 * Book Management API Tests
 * 
 * Tests all book-related endpoints including CRUD operations,
 * user management, and search functionality.
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

  describe('GET /api/books', () => {
    it('should return user books for authenticated user', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, admin in team 2
      const response = await auth.get('/api/books');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check book structure
      const book = response.body[0];
      validateBookObject(book);
      expect(book).toHaveProperty('role');
      expect(['viewer', 'collaborator', 'admin']).toContain(book.role);
    });

    it('should return empty array for user with no books', async () => {
      const auth = authenticatedRequest(noaccessToken); // User with no team access
      const response = await auth.get('/api/books');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return empty array for superadmin with no team access', async () => {
      const auth = authenticatedRequest(superadminToken); // Superadmin with no team membership
      const response = await auth.get('/api/books');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/books');

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/books/all', () => {
    it('should return all books for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/all');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that all test books are included
      const bookIds = response.body.map(w => w.id);
      expect(bookIds).toContain(TEST_BOOKS.BOOK1.id);
      expect(bookIds).toContain(TEST_BOOKS.BOOK2.id);
      expect(bookIds).toContain(TEST_BOOKS.SEARCH_BOOK.id);

      // Verify structure
      response.body.forEach(book => {
        validateBookObject(book);
      });
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/all');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/admin privileges required/i);
    });
  });

  describe('GET /api/books/search', () => {
    it('should search books by name for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/search?q=Test&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all results contain "Test" in name
      response.body.forEach(book => {
        validateBookObject(book);
        expect(book.name.toLowerCase()).toContain('test');
      });
    });

    it('should search books by ID for superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/books/search?q=${TEST_BOOKS.BOOK1.id}&limit=10`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const book = response.body.find(w => w.id === TEST_BOOKS.BOOK1.id);
        expect(book).toBeDefined();
        validateBookObject(book);
      }
    });

    it('should limit search results', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/search?q=Book&limit=2');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/search?q=NonExistentBook&limit=10');

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require search query parameter', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/books/search');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/books/search?q=Test&limit=10');

      validateApiResponse(response, 403);
    });
  });

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

  describe('POST /api/books', () => {
    beforeEach(resetBeforeTest);

    it('should create new book', async () => {
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
          teamId: 1, // Team 1
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
          teamId: 1 // Team 1
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
          teamId: 1
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
          teamId: 1
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
    beforeEach(resetBeforeTest);

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
    beforeEach(resetBeforeTest);

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
    beforeEach(async () => {
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

    beforeEach(async () => {
      await resetBeforeTest();
      // Create a fresh book with no dependent data for deletion testing
      const auth = authenticatedRequest(adminToken); // User 2: admin in team 1
      const createResponse = await auth.post('/api/books')
        .send({
          name: 'Deletable Book',
          teamId: 1, // Team 1 where user 2 is admin
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
    });

    it('should deny access for non-admin team member', async () => {
      const auth = authenticatedRequest(collaboratorToken); // User 3: collaborator in team 1, not admin

      const response = await auth.delete(`/api/books/${TEST_BOOKS.BOOK1.id}/permanent`);

      validateApiResponse(response, 403);
    });

    it('should deny access for user without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);

      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);

      validateApiResponse(response, 403);
    });

    it('should deny access for superadmin without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);

      validateApiResponse(response, 403);
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
    });
  });
});
