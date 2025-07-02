/**
 * User Book Management API Tests
 * 
 * Tests the book access management endpoints for users.
 */

const request = require('supertest');
const {
  TEST_USERS,
  TEST_WORKSPACES,
  loginUser,
  initializeTokenCache,
  authenticatedRequest,
  resetDatabase,
  validateApiResponse,
  app
} = require('../utils/test-helpers');

describe('User Book Management API', () => {
  let superadminToken;
  let testUserToken;

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
  });

  describe('GET /api/users/:id/books', () => {
    it('should return user book access as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get(`/api/users/${TEST_USERS.TESTUSER1.id}/books`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const book = response.body[0];
        expect(book).toHaveProperty('id');
        expect(book).toHaveProperty('name');
        expect(book).toHaveProperty('role');
        expect(book).toHaveProperty('created_at');

        expect(typeof book.id).toBe('number');
        expect(typeof book.name).toBe('string');
        expect(['viewer', 'collaborator', 'admin']).toContain(book.role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/users/99999/books');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get(`/api/users/${TEST_USERS.SUPERADMIN.id}/books`);

      validateApiResponse(response, 403);
    });
  });

  describe('POST /api/users/:id/books', () => {
    it('should add user to book as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Add testuser2 to book 2 as viewer
      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/books`)
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'viewer'
        });

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the user was added - they should have access to the book
      const addedBook = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE2.id);
      expect(addedBook).toBeDefined();
      expect(addedBook.role).toBe('viewer');
    });

    it('should add user as different roles', async () => {
      const auth = authenticatedRequest(superadminToken);
      const roles = ['viewer', 'collaborator', 'admin'];

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];

        // Create a new book for each role test to avoid conflicts
        const bookResponse = await auth.post('/api/books')
          .send({
            name: `Test Role Book ${role}`,
            note: `Book for testing ${role} role`,
            currency_symbol: '$'
          });

        validateApiResponse(bookResponse, 201);
        const bookId = bookResponse.body.id;

        const response = await auth.post(`/api/users/${TEST_USERS.REGULARUSER.id}/books`)
          .send({
            bookId: bookId,
            role: role
          });

        validateApiResponse(response, 201);

        // Verify the role was set correctly
        const checkResponse = await auth.get(`/api/users/${TEST_USERS.REGULARUSER.id}/books`);
        const userBook = checkResponse.body.find(w => w.id === bookId);
        expect(userBook).toBeDefined();
        expect(userBook.role).toBe(role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/users/99999/books')
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'viewer'
        });

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/books`)
        .send({
          bookId: 99999,
          role: 'viewer'
        });

      validateApiResponse(response, 404);
    });

    it('should return 409 if user already has access', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser1 already has access to book 1
      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER1.id}/books`)
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'admin'
        });

      validateApiResponse(response, 409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already.*access/i);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/books`)
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'invalid_role'
        });

      validateApiResponse(response, 400);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post(`/api/users/${TEST_USERS.TESTUSER2.id}/books`)
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE2.id,
          role: 'viewer'
        });

      validateApiResponse(response, 403);
    });
  });

  describe('PUT /api/users/:id/books/:bookId', () => {
    it('should update user book role as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Update testuser1's role in book 1 from collaborator to admin
      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({
          role: 'admin'
        });

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the role was updated - find the book in the response
      const updatedBook = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
      expect(updatedBook).toBeDefined();
      expect(updatedBook.role).toBe('admin');
    });

    it('should update to all valid roles', async () => {
      const auth = authenticatedRequest(superadminToken);
      const roles = ['viewer', 'collaborator', 'admin'];

      for (const role of roles) {
        const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
          .send({ role });

        validateApiResponse(response, 200);

        // Verify the role was updated in the response
        const updatedBook = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
        expect(updatedBook.role).toBe(role);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/99999/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/books/99999`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should return 404 if user has no access to book', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser2 has no access to book 3 (SEARCH_WORKSPACE)
      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/books/${TEST_WORKSPACES.SEARCH_WORKSPACE.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER1.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'invalid_role' });

      validateApiResponse(response, 400);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.put(`/api/users/${TEST_USERS.TESTUSER2.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({ role: 'admin' });

      validateApiResponse(response, 403);
    });
  });

  describe('DELETE /api/users/:id/books/:bookId', () => {
    it('should remove user from book as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Remove testuser1 from book 1
      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify the user was removed - book should not be in the response
      const removedBook = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
      expect(removedBook).toBeUndefined();

      // Restore original state: add testuser1 back as collaborator to book 1
      await auth.post(`/api/users/${TEST_USERS.TESTUSER1.id}/books`)
        .send({
          bookId: TEST_WORKSPACES.WORKSPACE1.id,
          role: 'collaborator'
        });
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/users/99999/books/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/books/99999`);

      validateApiResponse(response, 404);
    });

    it('should return 404 if user has no access to book', async () => {
      const auth = authenticatedRequest(superadminToken);

      // testuser2 has no access to book 3 (SEARCH_WORKSPACE)
      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER2.id}/books/${TEST_WORKSPACES.SEARCH_WORKSPACE.id}`);

      validateApiResponse(response, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.delete(`/api/users/${TEST_USERS.TESTUSER1.id}/books/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 403);
    });
  });
});
