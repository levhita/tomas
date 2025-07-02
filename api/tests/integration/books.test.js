/**
 * Book Management API Tests
 * 
 * Tests all book-related endpoints including CRUD operations,
 * user management, and search functionality.
 */

const request = require('supertest');
const {
  TEST_USERS,
  TEST_WORKSPACES,
  loginUser,
  getOrInitializeTokens,
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
  let testUserToken;
  let adminUserToken;
  let regularUserToken;

  beforeAll(async () => {
    // Initialize token cache once for all tests
    const tokens = await getOrInitializeTokens();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
    regularUserToken = tokens.regularuser;
    // testuser1 is admin of book 2
    adminUserToken = testUserToken;
  });

  // Reset database only before tests that modify data or create conflicts
  const resetBeforeTest = async () => {
    await resetDatabase();
    // Tokens should still be valid, but get them from cache or re-initialize if needed
    const tokens = await getOrInitializeTokens();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
    regularUserToken = tokens.regularuser;
    adminUserToken = testUserToken;
  };

  describe('GET /api/books', () => {
    it('should return user books for authenticated user', async () => {
      const auth = authenticatedRequest(testUserToken);
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
      const auth = authenticatedRequest(superadminToken);

      // Create a new user with no book access
      const userData = generateRandomData();
      const newUser = await createTestUser({
        username: userData.username,
        password: userData.password
      }, superadminToken);

      // Get token for the new user directly through cache
      const newUserToken = await loginUser({
        username: userData.username,
        password: userData.password,
        id: newUser.id
      });

      const newUserAuth = authenticatedRequest(newUserToken);
      const response = await newUserAuth.get('/api/books');

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
      expect(bookIds).toContain(TEST_WORKSPACES.WORKSPACE1.id);
      expect(bookIds).toContain(TEST_WORKSPACES.WORKSPACE2.id);
      expect(bookIds).toContain(TEST_WORKSPACES.SEARCH_WORKSPACE.id);

      // Verify structure
      response.body.forEach(book => {
        validateBookObject(book);
      });
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
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
      const response = await auth.get(`/api/books/search?q=${TEST_WORKSPACES.WORKSPACE1.id}&limit=10`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const book = response.body.find(w => w.id === TEST_WORKSPACES.WORKSPACE1.id);
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
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/books/search?q=Test&limit=10');

      validateApiResponse(response, 403);
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return book for user with access', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 200);
      validateBookObject(response.body);
      expect(response.body.id).toBe(TEST_WORKSPACES.WORKSPACE1.id);
      expect(response.body.name).toBe(TEST_WORKSPACES.WORKSPACE1.name);
    });

    it('should deny access to book user has no access to', async () => {
      const auth = authenticatedRequest(testUserToken);
      // testuser1 has no access to book 4
      const response = await auth.get('/api/books/4');

      validateApiResponse(response, 403);
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
      const auth = authenticatedRequest(testUserToken);
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName,
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
      const auth = authenticatedRequest(testUserToken);
      const bookData = generateRandomData();

      const response = await auth.post('/api/books')
        .send({
          name: bookData.bookName
        });

      validateApiResponse(response, 201);
      validateBookObject(response.body);
      expect(response.body.name).toBe(bookData.bookName);
      expect(response.body.currency_symbol).toBe('$'); // default
      expect(response.body.week_start).toBe('monday'); // default
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post('/api/books')
        .send({
          note: 'Missing name'
        });

      validateApiResponse(response, 400);
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
      const auth = authenticatedRequest(adminUserToken);
      const newName = `Updated ${Date.now()}`;

      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`)
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
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in book 1, not admin
      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}`)
        .send({
          name: 'Hacked Name'
        });

      validateApiResponse(response, 403);
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
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/deleted/i);

      // Verify book is soft deleted (should return 404)
      const getResponse = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`);
      validateApiResponse(getResponse, 404);
    });

    it('should deny access for non-admin user', async () => {
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in book 1, not admin
      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}`);

      validateApiResponse(response, 403);
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
      // Soft delete a book first
      const auth = authenticatedRequest(adminUserToken);
      await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`);
    });

    it('should restore soft-deleted book as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 200);
      validateBookObject(response.body);
      expect(response.body.id).toBe(TEST_WORKSPACES.WORKSPACE2.id);

      // Verify book is accessible again
      const getResponse = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`);
      validateApiResponse(getResponse, 200);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.post('/api/books/99999/restore');

      validateApiResponse(response, 404);
    });

    it('should return 400 for already active book', async () => {
      // First restore the book
      const auth = authenticatedRequest(superadminToken);
      await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      // Try to restore again
      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);

      validateApiResponse(response, 400);
    });
  });

  describe('DELETE /api/books/:id/permanent', () => {
    let deletableBookId;

    beforeEach(async () => {
      await resetBeforeTest();
      // Create a fresh book with no dependent data for deletion testing
      const auth = authenticatedRequest(superadminToken);
      const createResponse = await auth.post('/api/books')
        .send({
          name: 'Deletable Book',
          note: 'Book for deletion testing'
        });

      deletableBookId = createResponse.body.id;

      // Soft delete it first
      await auth.delete(`/api/books/${deletableBookId}`);
    });

    it('should cascade delete book with existing data', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Soft delete book 2 first (it has accounts)
      await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}`);

      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/permanent`);

      validateApiResponse(response, 204);

      // Verify the book is completely deleted (should get 404)
      const checkResponse = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/restore`);
      validateApiResponse(checkResponse, 404);
    });

    it('should permanently delete empty book as superadmin', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);

      validateApiResponse(response, 204);

      // Verify book cannot be restored
      const restoreResponse = await auth.post(`/api/books/${deletableBookId}/restore`);
      validateApiResponse(restoreResponse, 404);
    });

    it('should deny access for non-superadmin', async () => {
      const auth = authenticatedRequest(testUserToken);
      const superAuth = authenticatedRequest(superadminToken);

      // Use the deletable book that was already created and soft-deleted in beforeAll
      // testuser1 doesn't have access to this book, so this should fail with 403
      const response = await auth.delete(`/api/books/${deletableBookId}/permanent`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/books/99999/permanent');

      validateApiResponse(response, 404);
    });

    it('should return 400 for active book', async () => {
      const auth = authenticatedRequest(superadminToken);

      // Try to permanently delete an active book
      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/permanent`);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/soft-deleted/i);
    });
  });

  describe('GET /api/books/:id/users', () => {
    it('should return book users for admin', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`);

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

    it('should return book users for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/users`);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny access for non-member', async () => {
      const auth = authenticatedRequest(regularUserToken);

      // regularuser is not a member of book 1
      const response = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/users`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/books/99999/users');

      validateApiResponse(response, 404);
    });
  });

  describe('POST /api/books/:id/users', () => {
    beforeEach(resetBeforeTest);
    it('should add user to book as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify user was added
      const usersResponse = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`);
      const addedUser = usersResponse.body.find(u => u.id === userData.userId);
      expect(addedUser).toBeDefined();
      expect(addedUser.role).toBe(userData.role);
    });

    it('should add user with different roles', async () => {
      const auth = authenticatedRequest(adminUserToken);
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

        const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
          .send(userData);

        validateApiResponse(response, 201);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      // testuser1 is collaborator in book 1, not admin
      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/users`)
        .send(userData);

      validateApiResponse(response, 403);
    });

    it('should return 409 for user already in book', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.TESTUSER1.id, // Already a member
        role: 'viewer'
      };

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/already/i);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: 99999,
        role: 'viewer'
      };

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await auth.post('/api/books/99999/users')
        .send(userData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'invalid_role'
      };

      const response = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send(userData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });

    it('should reject missing required fields', async () => {
      const auth = authenticatedRequest(adminUserToken);

      // Missing userId
      const response1 = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({ role: 'viewer' });

      validateApiResponse(response1, 400);

      // Missing role
      const response2 = await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({ userId: TEST_USERS.REGULARUSER.id });

      validateApiResponse(response2, 400);
    });

    it('should allow superadmin to add users to any book', async () => {
      // Create a new book as testuser1 (superadmin won't be a member)
      const testUserAuth = authenticatedRequest(testUserToken);
      const createResponse = await testUserAuth.post('/api/books')
        .send({
          name: 'Test Book for Superadmin Access',
          note: 'Testing superadmin access'
        });

      const newBookId = createResponse.body.id;

      // Now superadmin should be able to add users to this book even though they're not a member
      const superAuth = authenticatedRequest(superadminToken);
      const userData = {
        userId: TEST_USERS.REGULARUSER.id,
        role: 'viewer'
      };

      const response = await superAuth.post(`/api/books/${newBookId}/users`)
        .send(userData);

      validateApiResponse(response, 201);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify user was added
      const usersResponse = await superAuth.get(`/api/books/${newBookId}/users`);
      const addedUser = usersResponse.body.find(u => u.id === userData.userId);
      expect(addedUser).toBeDefined();
      expect(addedUser.role).toBe(userData.role);
    });
  });

  describe('PUT /api/books/:id/users/:userId', () => {
    beforeEach(async () => {
      await resetBeforeTest();
      // Add regularuser to book2 as viewer
      const auth = authenticatedRequest(adminUserToken);
      await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({
          userId: TEST_USERS.REGULARUSER.id,
          role: 'viewer'
        });
    });

    it('should update user role as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'collaborator' };

      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role was updated
      const updatedUser = response.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.role).toBe(updateData.role);
    });

    it('should update to all valid roles', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const roles = ['admin', 'collaborator', 'viewer'];

      for (const role of roles) {
        const updateData = { role };

        const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
          .send(updateData);

        validateApiResponse(response, 200);
        expect(Array.isArray(response.body)).toBe(true);
        const updatedUser = response.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
        expect(updatedUser.role).toBe(role);
      }
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);
      const updateData = { role: 'admin' };

      // testuser1 is collaborator in book 1, not admin
      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/99999`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = { role: 'admin' };

      const response = await auth.put(`/api/books/99999/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should return 404 for user not in book', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'admin' };

      // Remove regularuser first
      await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 404);
    });

    it('should reject invalid role', async () => {
      const auth = authenticatedRequest(adminUserToken);
      const updateData = { role: 'invalid_role' };

      const response = await auth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`)
        .send(updateData);

      validateApiResponse(response, 400);
      expect(response.body.error).toMatch(/role/i);
    });

    it('should allow superadmin to demote last admin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // First remove superadmin from book2, leaving only testuser1 as admin
      await superAuth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now superadmin should be able to demote the last admin (testuser1) from book2
      const updateData = { role: 'viewer' };
      const response = await superAuth.put(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`)
        .send(updateData);

      // This should succeed for superadmin even though it's demoting the last admin
      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify role was updated
      const updatedUser = response.body.find(u => u.id === TEST_USERS.TESTUSER1.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.role).toBe('viewer');
    });
  });

  describe('DELETE /api/books/:id/users/:userId', () => {
    beforeEach(async () => {
      await resetBeforeTest();
      // Add regularuser to book2 as viewer
      const auth = authenticatedRequest(adminUserToken);
      await auth.post(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`)
        .send({
          userId: TEST_USERS.REGULARUSER.id,
          role: 'viewer'
        });
    });

    it('should remove user from book as admin', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 204);

      // Verify user was removed
      const usersResponse = await auth.get(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users`);
      const removedUser = usersResponse.body.find(u => u.id === TEST_USERS.REGULARUSER.id);
      expect(removedUser).toBeUndefined();
    });

    it('should deny access for collaborator', async () => {
      const auth = authenticatedRequest(testUserToken);

      // testuser1 is collaborator in book 1, not admin
      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE1.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 403);
    });

    it('should return 404 for non-existent user', async () => {
      const auth = authenticatedRequest(adminUserToken);

      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/99999`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for non-existent book', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete(`/api/books/99999/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 404);
    });

    it('should return 404 for user not in book', async () => {
      const auth = authenticatedRequest(adminUserToken);

      // Remove regularuser first
      await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      // Try to remove again
      const response = await auth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.REGULARUSER.id}`);

      validateApiResponse(response, 404);
    });

    it('should prevent removing last admin for non-superadmin', async () => {
      const superAuth = authenticatedRequest(superadminToken);
      const adminAuth = authenticatedRequest(adminUserToken);

      // First remove superadmin from book2, leaving only testuser1 as admin
      await superAuth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now try to remove the last admin (testuser1) from book2 using testuser1's token
      const response = await adminAuth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`);

      // This should be prevented with 409 Conflict for non-superadmin
      validateApiResponse(response, 409);
      expect(response.body.error).toMatch(/last admin/i);
    });

    it('should allow superadmin to remove last admin', async () => {
      const superAuth = authenticatedRequest(superadminToken);

      // First remove superadmin from book2, leaving only testuser1 as admin
      await superAuth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.SUPERADMIN.id}`);

      // Now superadmin should be able to remove the last admin (testuser1) from book2
      const response = await superAuth.delete(`/api/books/${TEST_WORKSPACES.WORKSPACE2.id}/users/${TEST_USERS.TESTUSER1.id}`);

      // This should succeed for superadmin
      validateApiResponse(response, 204);
    });
  });
});
