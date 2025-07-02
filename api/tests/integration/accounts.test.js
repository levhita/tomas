/**
 * Accounts API Tests
 * 
 * Tests all account-related endpoints including listing, details, balances,
 * creation, updates, and deletion with proper permission checking.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  initializeTokenCache,
  authenticatedRequest,
  validateApiResponse,
  generateRandomData,
  app
} = require('../utils/test-helpers');

describe('Accounts Management API', () => {
  let superadminToken;
  let testUserToken;
  let testBookId = 1; // From test data

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
  });

  describe('GET /api/accounts', () => {
    it('should return accounts for book with read access', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/accounts')
        .query({ book_id: testBookId });

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const account = response.body[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('type');
        expect(account).toHaveProperty('book_id');
        expect(account.book_id).toBe(testBookId);
      }
    });

    it('should deny access without book_id parameter', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/accounts');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/book_id.*required/i);
    });

    it('should deny access to book without permission', async () => {
      const auth = authenticatedRequest(testUserToken);
      const nonAccessibleBookId = 999; // Book user has no access to

      const response = await auth.get('/api/accounts')
        .query({ book_id: nonAccessibleBookId });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .query({ book_id: testBookId });

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should return account details for valid account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1; // From test data

      const response = await auth.get(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', testAccountId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('book_id');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/accounts/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/account not found/i);
    });

    it('should allow access to account in book with permission', async () => {
      // Get a fresh token for testuser1 to avoid any token caching issues
      const freshTestUserToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshTestUserToken);
      const superAuth = authenticatedRequest(superadminToken);

      // Verify testuser1 has admin permissions in book 2, if not, add them
      const addUserResponse = await superAuth.post('/api/books/2/users').send({
        userId: 2, // testuser1's ID from test schema
        role: 'admin'
      });
      if (addUserResponse.status !== 409 && addUserResponse.status !== 201) {
        throw new Error(`Failed to add testuser1 to book 2. Status: ${addUserResponse.status}, Body: ${JSON.stringify(addUserResponse.body)}`);
      }

      // Create a fresh account for this test 
      const createAccountResponse = await auth.post('/api/accounts').send({
        name: 'Test Account for Permission Check',
        note: 'Created for testing book permission access',
        type: 'debit',
        book_id: 2
      });

      if (createAccountResponse.status !== 201) {
        throw new Error(`Failed to create account. Status: ${createAccountResponse.status}, Body: ${JSON.stringify(createAccountResponse.body)}`);
      }

      const testAccountId = createAccountResponse.body.id;

      // Test that testuser1 can access the account they just created in book 2
      const response = await auth.get(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', testAccountId);
      expect(response.body).toHaveProperty('book_id', 2);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/accounts/1');

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/accounts/:id/balance', () => {
    it('should return account balance for valid account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1; // From test data

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('exercised_balance');
      expect(response.body).toHaveProperty('projected_balance');
      expect(typeof response.body.exercised_balance).toBe('number');
      expect(typeof response.body.projected_balance).toBe('number');
    });

    it('should return balance up to specific date', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1;
      const upToDate = '2024-12-01';

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`)
        .query({ upToDate });

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('exercised_balance');
      expect(response.body).toHaveProperty('projected_balance');
    });

    it('should reject invalid date format', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1;

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`)
        .query({ upToDate: 'invalid-date' });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid date format/i);
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/accounts/99999/balance');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/accounts/1/balance');

      validateApiResponse(response, 401);
    });
  });

  describe('POST /api/accounts', () => {
    it('should create new account as admin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: `Test Account ${Date.now()}`,
        note: 'Test account description',
        type: 'debit',
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(accountData.name);
      expect(response.body.note).toBe(accountData.note);
      expect(response.body.type).toBe(accountData.type);
      expect(response.body.book_id).toBe(accountData.book_id);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should create credit account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: `Credit Account ${Date.now()}`,
        type: 'credit',
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 201);
      expect(response.body.type).toBe('credit');
    });

    it('should default to debit type when not specified', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: `Default Type Account ${Date.now()}`,
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 201);
      expect(response.body.type).toBe('debit');
    });

    it('should reject missing name', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/name.*required/i);
    });

    it('should reject missing book_id', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: 'Test Account'
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/book_id.*required/i);
    });

    it('should deny access for non-admin users', async () => {
      const auth = authenticatedRequest(testUserToken);
      const accountData = {
        name: 'Unauthorized Account',
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const accountData = {
        name: 'Test Account',
        book_id: testBookId
      };

      const response = await request(app)
        .post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 401);
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('should update account as admin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // First create an account to update
      const createResponse = await auth.post('/api/accounts')
        .send({
          name: 'Account to Update',
          book_id: testBookId
        });

      expect(createResponse.status).toBe(201);
      const accountId = createResponse.body.id;

      const updateData = {
        name: 'Updated Account Name',
        note: 'Updated description',
        type: 'credit'
      };

      const response = await auth.put(`/api/accounts/${accountId}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.note).toBe(updateData.note);
      expect(response.body.type).toBe(updateData.type);
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = {
        name: 'Updated Name'
      };

      const response = await auth.put('/api/accounts/99999')
        .send(updateData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-admin users', async () => {
      const auth = authenticatedRequest(testUserToken);
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await auth.put('/api/accounts/1')
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/accounts/1')
        .send(updateData);

      validateApiResponse(response, 401);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete account without transactions as admin', async () => {
      const auth = authenticatedRequest(superadminToken);

      // First create an account to delete
      const createResponse = await auth.post('/api/accounts')
        .send({
          name: 'Account to Delete',
          book_id: testBookId
        });

      expect(createResponse.status).toBe(201);
      const accountId = createResponse.body.id;

      const response = await auth.delete(`/api/accounts/${accountId}`);

      validateApiResponse(response, 204);

      // Verify account was deleted
      const getResponse = await auth.get(`/api/accounts/${accountId}`);
      validateApiResponse(getResponse, 404);
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.delete('/api/accounts/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent deletion of account with transactions', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountIdWithTransactions = 1; // Account from test data that has transactions

      const response = await auth.delete(`/api/accounts/${accountIdWithTransactions}`);

      validateApiResponse(response, 428);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot delete.*transactions/i);
    });

    it('should deny access for non-admin users', async () => {
      const auth = authenticatedRequest(testUserToken);

      const response = await auth.delete('/api/accounts/1');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).delete('/api/accounts/1');

      validateApiResponse(response, 401);
    });
  });
});
