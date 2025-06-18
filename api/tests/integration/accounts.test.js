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
  let testWorkspaceId = 1; // From test data

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    testUserToken = tokens.testuser1;
  });

  describe('GET /api/accounts', () => {
    it('should return accounts for workspace with read access', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/accounts')
        .query({ workspace_id: testWorkspaceId });

      validateApiResponse(response, 200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const account = response.body[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('name');
        expect(account).toHaveProperty('type');
        expect(account).toHaveProperty('workspace_id');
        expect(account.workspace_id).toBe(testWorkspaceId);
      }
    });

    it('should deny access without workspace_id parameter', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/accounts');

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/workspace_id.*required/i);
    });

    it('should deny access to workspace without permission', async () => {
      const auth = authenticatedRequest(testUserToken);
      const nonAccessibleWorkspaceId = 999; // Workspace user has no access to

      const response = await auth.get('/api/accounts')
        .query({ workspace_id: nonAccessibleWorkspaceId });

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .query({ workspace_id: testWorkspaceId });

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
      expect(response.body).toHaveProperty('workspace_id');
      expect(response.body).toHaveProperty('created_at');
    });

    it('should return 404 for non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);

      const response = await auth.get('/api/accounts/99999');

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/account not found/i);
    });

    it('should allow access to account in workspace with permission', async () => {
      // Ensure we have a fresh token for this test to avoid CI race conditions
      const freshTestUserToken = await loginUser(TEST_USERS.TESTUSER1);
      const auth = authenticatedRequest(freshTestUserToken);
      const testAccountId = 3; // Account in workspace 2, where testuser1 is admin

      // Add debugging to understand CI failures
      console.log('Debug: Testing access to account', testAccountId, 'with testuser1');

      // First verify that account 3 exists
      const allAccountsResponse = await auth.get('/api/accounts').query({ workspace_id: 2 });
      console.log('Debug: All accounts in workspace 2:', allAccountsResponse.body);

      const response = await auth.get(`/api/accounts/${testAccountId}`);

      // Log response for debugging
      if (response.status !== 200) {
        console.error('Debug: Unexpected response status:', response.status);
        console.error('Debug: Response body:', response.body);

        // Check if account exists in any workspace
        const superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
        const superAuth = authenticatedRequest(superadminToken);
        const allWorkspaceAccounts = await superAuth.get('/api/accounts').query({ workspace_id: 1 });
        console.error('Debug: All accounts in workspace 1:', allWorkspaceAccounts.body);
      }

      // testuser1 is admin of workspace 2, so should have access to account 3
      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id', testAccountId);
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
        workspace_id: testWorkspaceId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(accountData.name);
      expect(response.body.note).toBe(accountData.note);
      expect(response.body.type).toBe(accountData.type);
      expect(response.body.workspace_id).toBe(accountData.workspace_id);
      expect(response.body).toHaveProperty('created_at');
    });

    it('should create credit account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: `Credit Account ${Date.now()}`,
        type: 'credit',
        workspace_id: testWorkspaceId
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
        workspace_id: testWorkspaceId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 201);
      expect(response.body.type).toBe('debit');
    });

    it('should reject missing name', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        workspace_id: testWorkspaceId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/name.*required/i);
    });

    it('should reject missing workspace_id', async () => {
      const auth = authenticatedRequest(superadminToken);
      const accountData = {
        name: 'Test Account'
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/workspace_id.*required/i);
    });

    it('should deny access for non-admin users', async () => {
      const auth = authenticatedRequest(testUserToken);
      const accountData = {
        name: 'Unauthorized Account',
        workspace_id: testWorkspaceId
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const accountData = {
        name: 'Test Account',
        workspace_id: testWorkspaceId
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
          workspace_id: testWorkspaceId
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
          workspace_id: testWorkspaceId
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
