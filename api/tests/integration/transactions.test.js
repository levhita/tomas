/**
 * Transactions API Tests
 * 
 * Tests all transaction-related endpoints including listing, details,
 * creation, updates, and deletion with proper permission checking.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  authenticatedRequest,
  validateApiResponse,
  generateRandomData,
  app
} = require('../utils/test-helpers');

describe('Transactions Management API', () => {
  let superadminToken;
  let testUserToken;
  let testWorkspaceId = 1; // From test data
  let testAccountId = 1; // From test data
  let testCategoryId = 1; // From test data

  beforeAll(async () => {
    // Login once at the beginning - the global setup has already created test data
    superadminToken = await loginUser(TEST_USERS.SUPERADMIN);
    testUserToken = await loginUser(TEST_USERS.TESTUSER1);
  });

  describe('GET /api/transactions', () => {
    it('should return transactions for account with read access', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions')
        .query({ accountId: testAccountId });

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
        expect(transaction.account_id).toBe(testAccountId);
        expect(typeof transaction.exercised).toBe('boolean');
      }
    });

    it('should return transactions with date filtering', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions')
        .query({
          accountId: testAccountId,
          startDate: '2024-12-01',
          endDate: '2024-12-31'
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

    it('should deny access without accountId parameter', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions');

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('accountId is required');
    });

    it('should deny access to non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions')
        .query({ accountId: 99999 });

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Account not found');
    });

    it('should deny access to account without permission', async () => {
      // Account 3 is in workspace 2, testuser1 is admin of workspace 2
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/transactions')
        .query({ accountId: 1 }); // Account 1 is in workspace 1, testuser1 is collaborator

      validateApiResponse(response, 200); // Should work as testuser1 is collaborator in workspace 1
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ accountId: testAccountId });

      validateApiResponse(response, 401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details for valid transaction', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions/1');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('exercised');
      expect(response.body).toHaveProperty('account_id');
      expect(response.body).toHaveProperty('account_name');
      expect(typeof response.body.exercised).toBe('boolean');
    });

    it('should return 404 for non-existent transaction', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions/99999');

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow access to transaction in workspace with permission', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.get('/api/transactions/1');

      validateApiResponse(response, 200);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/transactions/1');

      validateApiResponse(response, 401);
    });
  });

  describe('POST /api/transactions', () => {
    it('should create new transaction as admin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Test Transaction',
        note: 'Created by test',
        amount: -50.00,
        date: '2024-12-15',
        exercised: true,
        account_id: testAccountId,
        category_id: testCategoryId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.description).toBe(transactionData.description);
      expect(response.body.note).toBe(transactionData.note);
      expect(parseFloat(response.body.amount)).toBe(transactionData.amount);
      expect(response.body.date).toContain('2024-12-15');
      expect(response.body.exercised).toBe(true);
      expect(response.body.account_id).toBe(testAccountId);
      expect(response.body.category_id).toBe(testCategoryId);
      expect(response.body).toHaveProperty('account_name');
      expect(response.body).toHaveProperty('category_name');
    });

    it('should create transaction without note and category', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Simple Transaction',
        amount: 100.00,
        date: '2024-12-16',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 201);
      expect(response.body.description).toBe(transactionData.description);
      expect(response.body.note).toBeNull();
      expect(response.body.category_id).toBeNull();
      expect(response.body.exercised).toBe(false);
    });

    it('should reject missing description', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        amount: -25.00,
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.error).toContain('description');
    });

    it('should reject missing amount', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Missing Amount Transaction',
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.error).toContain('amount');
    });

    it('should reject invalid date format', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Invalid Date Transaction',
        amount: -25.00,
        date: 'invalid-date',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should reject non-existent account', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Transaction for missing account',
        amount: -25.00,
        date: '2024-12-17',
        account_id: 99999
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Account not found');
    });

    it('should reject category from different workspace', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Cross-workspace category transaction',
        amount: -25.00,
        date: '2024-12-17',
        account_id: testAccountId, // Account in workspace 1
        category_id: 3 // Category 3 is in workspace 2
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Category must belong to the same workspace');
    });

    it('should allow collaborator to create transaction', async () => {
      const auth = authenticatedRequest(testUserToken);
      const transactionData = {
        description: 'Collaborator Transaction',
        amount: -30.00,
        date: '2024-12-18',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 201);
      expect(response.body.description).toBe(transactionData.description);
    });

    it('should deny access without authentication', async () => {
      const transactionData = {
        description: 'Unauthenticated Transaction',
        amount: -25.00,
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await request(app)
        .post('/api/transactions')
        .send(transactionData);

      validateApiResponse(response, 401);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    let transactionIdToUpdate;

    beforeEach(async () => {
      // Create a transaction to update
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Transaction to Update',
        amount: -40.00,
        date: '2024-12-19',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      transactionIdToUpdate = response.body.id;
    });

    it('should update transaction as admin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = {
        description: 'Updated Transaction',
        note: 'Updated by test',
        amount: -60.00,
        date: '2024-12-20',
        exercised: true,
        account_id: testAccountId,
        category_id: testCategoryId
      };

      const response = await auth.put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.note).toBe(updateData.note);
      expect(parseFloat(response.body.amount)).toBe(updateData.amount);
      expect(response.body.exercised).toBe(true);
      expect(response.body.category_id).toBe(testCategoryId);
    });

    it('should return 404 for non-existent transaction', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = {
        description: 'Update Missing Transaction',
        amount: -60.00,
        date: '2024-12-20',
        account_id: testAccountId
      };

      const response = await auth.put('/api/transactions/99999')
        .send(updateData);

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow collaborator to update transaction', async () => {
      const auth = authenticatedRequest(testUserToken);
      const updateData = {
        description: 'Updated by Collaborator',
        amount: -45.00,
        date: '2024-12-21',
        account_id: testAccountId
      };

      const response = await auth.put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        description: 'Unauthorized Update',
        amount: -50.00,
        date: '2024-12-22',
        account_id: testAccountId
      };

      const response = await request(app)
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 401);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    let transactionIdToDelete;

    beforeEach(async () => {
      // Create a transaction to delete
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Transaction to Delete',
        amount: -35.00,
        date: '2024-12-23',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions')
        .send(transactionData);

      transactionIdToDelete = response.body.id;
    });

    it('should delete transaction as admin', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 204);

      // Verify transaction is deleted
      const getResponse = await auth.get(`/api/transactions/${transactionIdToDelete}`);
      validateApiResponse(getResponse, 404);
    });

    it('should return 404 for non-existent transaction', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.delete('/api/transactions/99999');

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow collaborator to delete transaction', async () => {
      const auth = authenticatedRequest(testUserToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 204);
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 401);
    });
  });
});
