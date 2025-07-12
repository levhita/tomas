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
  let adminToken;          // User with admin role in team 1
  let viewerToken;         // User with viewer role in team 1  
  let collaboratorToken;   // User with collaborator role in team 1
  let noaccessToken;       // User with no team access for permission-denied scenarios
  let testBookId = 1; // From test data

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;           // User 2: admin in team 1, viewer in team 2
    viewerToken = tokens.viewer;         // User 4: viewer in team 1, collaborator in team 2
    collaboratorToken = tokens.collaborator; // User 3: collaborator in team 1, admin in team 2
    noaccessToken = tokens.noaccess;     // User 5: no team access
  });



  describe('GET /api/accounts/:id', () => {
    it('should return account details for valid account', async () => {
      const auth = authenticatedRequest(adminToken); // User 2 has admin access to team 1
      const testAccountId = 1; // From test data - belongs to book 1 (team 1)

      const response = await auth.get(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', testAccountId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('book_id');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.get('/api/accounts/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/account not found/i);
    });

    it('should deny access to account without permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const testAccountId = 1; // From test data - belongs to book 1

      const response = await auth.get(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access to account without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1; // From test data - belongs to book 1

      const response = await auth.get(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow access to account in book with permission', async () => {
      // Use collaborator token (user 3) who is admin of team 2 which owns book 2
      const auth = authenticatedRequest(collaboratorToken);

      // Create a fresh account for this test in book 2 where user 3 has admin access
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

      // Test that user 3 (collaborator in team 1, admin in team 2) can access the account they created in book 2
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
      const auth = authenticatedRequest(adminToken); // Use admin token for team 1 access
      const testAccountId = 1; // From test data

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('exercised_balance');
      expect(response.body).toHaveProperty('projected_balance');
      expect(typeof response.body.exercised_balance).toBe('number');
      expect(typeof response.body.projected_balance).toBe('number');
    });

    it('should return balance up to specific date', async () => {
      const auth = authenticatedRequest(adminToken); // Use admin token
      const testAccountId = 1;
      const upToDate = '2024-12-01';

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`)
        .query({ up_to_date: upToDate });

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('exercised_balance');
      expect(response.body).toHaveProperty('projected_balance');
    });

    it('should reject invalid date format', async () => {
      const auth = authenticatedRequest(adminToken); // Use admin token
      const testAccountId = 1;

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`)
        .query({ up_to_date: 'invalid-date' });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid date format/i);
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(adminToken);

      const response = await auth.get('/api/accounts/99999/balance');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access to account balance without permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const testAccountId = 1; // From test data - belongs to book 1

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access to account balance without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const testAccountId = 1; // From test data - belongs to book 1

      const response = await auth.get(`/api/accounts/${testAccountId}/balance`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/accounts/1/balance');

      validateApiResponse(response, 401);
    });
  });

  describe('POST /api/accounts', () => {
    it('should create new account as admin', async () => {
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
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
      // Use viewer token (user 4) who only has viewer role in team 1 (read-only access)
      const auth = authenticatedRequest(viewerToken);
      const accountData = {
        name: 'Unauthorized Account',
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for users without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const accountData = {
        name: 'No Access Account',
        book_id: testBookId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: 'Superadmin No Access Account',
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
      const auth = authenticatedRequest(adminToken);

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
      const auth = authenticatedRequest(adminToken);
      const updateData = {
        name: 'Updated Name'
      };

      const response = await auth.put('/api/accounts/99999')
        .send(updateData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for non-admin users', async () => {
      // Use viewer token (user 4) who only has viewer role in team 1 (read-only access)
      const auth = authenticatedRequest(viewerToken);
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await auth.put('/api/accounts/1')
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for users without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const updateData = {
        name: 'No Access Update'
      };

      const response = await auth.put('/api/accounts/1')
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = {
        name: 'Superadmin No Access Update'
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
      const auth = authenticatedRequest(adminToken);

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
      const auth = authenticatedRequest(adminToken);

      const response = await auth.delete('/api/accounts/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent deletion of account with transactions', async () => {
      const auth = authenticatedRequest(adminToken);
      const accountIdWithTransactions = 1; // Account from test data that has transactions

      const response = await auth.delete(`/api/accounts/${accountIdWithTransactions}`);

      validateApiResponse(response, 428);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot delete.*transactions/i);
    });

    it('should deny access for non-admin users', async () => {
      // Use viewer token (user 4) who only has viewer role in team 1 (read-only access)
      const auth = authenticatedRequest(viewerToken);

      // Try to delete any account in team 1 - should be denied due to lack of permission
      // Use an account without transactions (we'll create a fresh one) to ensure we get 403, not 428
      const adminAuth = authenticatedRequest(adminToken);
      const createResponse = await adminAuth.post('/api/accounts').send({
        name: 'Account for Permission Test',
        book_id: testBookId
      });

      expect(createResponse.status).toBe(201);
      const testAccountId = createResponse.body.id;

      const response = await auth.delete(`/api/accounts/${testAccountId}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access for users without team permission', async () => {
      const auth = authenticatedRequest(noaccessToken);

      const response = await auth.delete('/api/accounts/1');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team permission', async () => {
      const auth = authenticatedRequest(superadminToken);

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
