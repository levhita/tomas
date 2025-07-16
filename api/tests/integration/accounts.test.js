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
  resetDatabase,
  app
} = require('../utils/test-helpers');

describe('Accounts Management API', () => {
  let superadminToken;
  let adminToken;          // User with admin role in team 1
  let viewerToken;         // User with viewer role in team 1  
  let collaboratorToken;   // User with collaborator role in team 1
  let noaccessToken;       // User with no team access for permission-denied scenarios
  let testBookId = 1; // From test data

  // Token initialization and reset helper
  async function refreshTokens() {
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;
    viewerToken = tokens.viewer;
    collaboratorToken = tokens.collaborator;
    noaccessToken = tokens.noaccess;
  }

  beforeAll(async () => {
    await resetDatabase();
    await refreshTokens();
  });

  // Reset database only before tests that modify data or create conflicts
  const resetBeforeTest = async () => {
    await resetDatabase();
  };


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

    it('should return 404 "Account not found" for user with no access to the team', async () => {
      // Account 1 exists, but user 5 (noaccessToken) has no access to its book
      const auth = authenticatedRequest(noaccessToken);
      const response = await auth.get('/api/accounts/1');
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied to this team');
    });

    it('should return 404 "Account not found" if the team for the account\'s book does not exist', async () => {
      // Soft-delete the team for book 1 (team 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Account 1 belongs to book 1, which belongs to team 1 (now deleted)
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/accounts/1');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Account not found');
    });
  });

  describe('GET /api/accounts/:id/balance', () => {
    it('should return account balance for valid account', async () => {
      await resetBeforeTest();
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

    it('should return 404 when creating an account on a non-existent book', async () => {
      const auth = authenticatedRequest(adminToken);
      const accountData = {
        name: 'Account for Nonexistent Book',
        book_id: 99999 // Book does not exist
      };

      const response = await auth.post('/api/accounts')
        .send(accountData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/book not found/i);
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

    it('should return 404 when editing an account whose book\'s team does not exist', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create an account in book 1 (team 1)
      const createResponse = await auth.post('/api/accounts')
        .send({
          name: 'Account for Edit Book Not Found',
          book_id: 1
        });
      expect(createResponse.status).toBe(201);
      const accountId = createResponse.body.id;

      // Soft-delete the team for book 1 (team 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Try to edit the account
      const updateData = { name: 'Should Not Update' };
      const response = await auth.put(`/api/accounts/${accountId}`)
        .send(updateData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/team not found/i);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should delete account without transactions as admin', async () => { 
      await resetBeforeTest();
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

    it('should return 428 when trying to delete an account with transactions', async () => {
      const auth = authenticatedRequest(adminToken);
      // Account 1 from test data is expected to have transactions
      const response = await auth.delete('/api/accounts/1');
      validateApiResponse(response, 428);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot delete account with transactions/i);
    });

    it('should deny access for non-admin users', async () => {
 
      // Use viewer token (user 4) who only has viewer role in team 1 (read-only access)
      const auth = authenticatedRequest(viewerToken);

      // create a fresh account to delete using admin token
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

    it('should return 404 when deleting an account whose book\'s team does not exist', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create an account in book 1 (team 1)
      const createResponse = await auth.post('/api/accounts')
        .send({
          name: 'Account for Delete Book Not Found',
          book_id: 1
        });
      expect(createResponse.status).toBe(201);
      const accountId = createResponse.body.id;

      // Soft-delete the team for book 1 (team 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Try to delete the account
      const response = await auth.delete(`/api/accounts/${accountId}`);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/book not found/i);
    });
  });
});
