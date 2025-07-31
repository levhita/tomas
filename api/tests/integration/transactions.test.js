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
  initializeTokenCache,
  authenticatedRequest,
  validateApiResponse,
  generateRandomData,
  app,
  resetDatabase
} = require('../utils/test-helpers');

describe('Transactions Management API', () => {
  let superadminToken, adminToken, collaboratorToken, viewerToken, noaccessToken;
  // Make sure these IDs match what's in the test_seeds.sql file
  let testBookId = 1; // From test data
  let testAccountId = 1; // Test Checking Account
  let testCategoryId = 2; // Food & Dining category

  beforeAll(async () => {
    await resetDatabase();
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;
    collaboratorToken = tokens.collaborator;
    viewerToken = tokens.viewer;
    noaccessToken = tokens.noaccess;
  });

  describe('GET /api/transactions/:id', () => {
    it('should return transaction details for valid transaction', async () => {
      const auth = authenticatedRequest(adminToken);
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
      const auth = authenticatedRequest(adminToken);
      const response = await auth.get('/api/transactions/99999');

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow access to transaction in book with permission', async () => {
      const auth = authenticatedRequest(collaboratorToken);
      const response = await auth.get('/api/transactions/1');

      validateApiResponse(response, 200);
    });

    it('should deny access to transaction without permission', async () => {
      // Use noaccess user who has no team membership
      const auth = authenticatedRequest(noaccessToken);
      const response = await auth.get('/api/transactions/1'); // Transaction 1 is in book 1

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access to superadmin without team membership', async () => {
      // Use superadmin who is not a member of any team
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.get('/api/transactions/1');

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/transactions/1');

      validateApiResponse(response, 401);
    });

    it('should return 404 for a transaction if the book was soft-deleted', async () => {
      const tokens = await initializeTokenCache();
      const adminToken = tokens.admin;
      // Find a transaction for account in book 1
      const auth = authenticatedRequest(adminToken);
      const transactionsResponse = await auth.get('/api/books/1/transactions');
      const transaction = transactionsResponse.body[0];
      expect(transaction).toBeDefined();

      // Soft-delete book 1
      const adminAuth = authenticatedRequest(adminToken);
      await adminAuth.delete('/api/books/1');

      // Try to fetch the transaction
      const response = await auth.get(`/api/transactions/${transaction.id}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Book not found');
      await resetDatabase(); // Clean up after test
    });

    it('should return 404 for a transaction if the team was soft-deleted', async () => {
      const { authenticatedRequest, initializeTokenCache } = require('../utils/test-helpers');
      const tokens = await initializeTokenCache();
      const adminToken = tokens.admin;
      const superadminToken = tokens.superadmin;

      // Find a transaction for account in book 1 (team 1)
      const auth = authenticatedRequest(adminToken);
      const transactionsResponse = await auth.get('/api/books/1/transactions');
      const transaction = transactionsResponse.body[0];
      expect(transaction).toBeDefined();

      // Soft-delete team 1 (which owns book 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Try to fetch the transaction
      const response = await auth.get(`/api/transactions/${transaction.id}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Book not found');
      await resetDatabase(); // Clean up after test
    });
  });

  describe('POST /api/transactions', () => {
    it('should create new transaction as admin', async () => {
      await resetDatabase();
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Test Transaction',
        note: 'Created by test',
        amount: -50.0,
        date: '2024-12-15',
        exercised: true,
        account_id: testAccountId,
        category_id: testCategoryId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

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
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Simple Transaction',
        amount: 100.0,
        date: '2024-12-16',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 201);
      expect(response.body.description).toBe(transactionData.description);
      expect(response.body.note).toBeNull();
      expect(response.body.category_id).toBeNull();
      expect(response.body.exercised).toBe(false);
    });

    it('should reject missing description', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        amount: -25.0,
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.error).toContain('description');
    });

    it('should reject missing amount', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Missing Amount Transaction',
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Missing required fields');
      expect(response.body.error).toContain('amount');
    });

    it('should reject invalid date format', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Invalid Date Transaction',
        amount: -25.0,
        date: 'invalid-date',
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should reject non-existent account', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Transaction for missing account',
        amount: -25.0,
        date: '2024-12-17',
        account_id: 99999
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Account not found');
    });

    it('should reject category from different book', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Cross-book category transaction',
        amount: -25.0,
        date: '2024-12-17',
        account_id: testAccountId, // Account in book 1
        category_id: 3 // Category 3 is in book 2
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body.error).toContain('Category must belong to the same book');
    });

    it('should allow collaborator to create transaction', async () => {
      const auth = authenticatedRequest(collaboratorToken);
      const transactionData = {
        description: 'Collaborator Transaction',
        amount: -30.0,
        date: '2024-12-18',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 201);
      expect(response.body.description).toBe(transactionData.description);
    });

    it('should deny viewer access to create transaction', async () => {
      const auth = authenticatedRequest(viewerToken);
      const transactionData = {
        description: 'Viewer Transaction',
        amount: -25.0,
        date: '2024-12-18',
        exercised: false,
        account_id: testAccountId // Account in book 1, viewer only has read access
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without team membership', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const transactionData = {
        description: 'No Access Transaction',
        amount: -25.0,
        date: '2024-12-18',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team membership', async () => {
      const auth = authenticatedRequest(superadminToken);
      const transactionData = {
        description: 'Superadmin Transaction',
        amount: -25.0,
        date: '2024-12-18',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const transactionData = {
        description: 'Unauthenticated Transaction',
        amount: -25.0,
        date: '2024-12-17',
        account_id: testAccountId
      };

      const response = await request(app).post('/api/transactions').send(transactionData);

      validateApiResponse(response, 401);
    });

    it('should deny adding a transaction to a book that was soft-deleted', async () => {
      const auth = authenticatedRequest(adminToken);

      // Soft-delete book 1
      await auth.delete('/api/books/1');

      // Try to add a transaction to an account in book 1
      const transactionData = {
        description: 'Transaction to soft-deleted book',
        amount: -10.0,
        date: '2024-12-25',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Book not found');
      await resetDatabase(); // Clean up after test
    });

    it('should deny adding a transaction to a team that was soft-deleted', async () => {
      const auth = authenticatedRequest(adminToken);

      // Soft-delete team 1 (owner of book 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Try to add a transaction to an account in book 1
      const transactionData = {
        description: 'Transaction to soft-deleted book',
        amount: -10.0,
        date: '2024-12-25',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Book not found');
      await resetDatabase(); // Clean up after test
    });

    it('should return 404 for invalid category on post', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Invalid Category Transaction',
        amount: -20.0,
        date: '2024-12-26',
        exercised: false,
        account_id: testAccountId,
        category_id: 99999 // Non-existent category
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Category not found');
    });

    it('should return 400 if category_id is not a number', async () => {
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Invalid category_id type',
        amount: -10.0,
        date: '2024-12-31',
        exercised: false,
        account_id: testAccountId,
        category_id: 'not-a-number'
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error', 'category_id must be a number');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    let transactionIdToUpdate;

    beforeEach(async () => {
      // Create a transaction to update
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Transaction to Update',
        amount: -40.0,
        date: '2024-12-19',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      transactionIdToUpdate = response.body.id;
    });

    it('should update transaction as admin', async () => {
      const auth = authenticatedRequest(adminToken);
      const updateData = {
        description: 'Updated Transaction',
        note: 'Updated by test',
        amount: -60.0,
        date: '2024-12-20',
        exercised: true,
        account_id: testAccountId,
        category_id: testCategoryId
      };

      const response = await auth
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.note).toBe(updateData.note);
      expect(parseFloat(response.body.amount)).toBe(updateData.amount);
      expect(response.body.exercised).toBe(true);
      expect(response.body.category_id).toBe(testCategoryId);
    });

    it('should return 404 for non-existent transaction', async () => {
      const auth = authenticatedRequest(adminToken);
      const updateData = {
        description: 'Update Missing Transaction',
        amount: -60.0,
        date: '2024-12-20',
        account_id: testAccountId
      };

      const response = await auth.put('/api/transactions/99999').send(updateData);

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow collaborator to update transaction', async () => {
      const auth = authenticatedRequest(collaboratorToken);
      const updateData = {
        description: 'Updated by Collaborator',
        amount: -45.0,
        date: '2024-12-21',
        account_id: testAccountId
      };

      const response = await auth
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 200);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should deny viewer access to update transaction', async () => {
      const auth = authenticatedRequest(viewerToken);
      const updateData = {
        description: 'Viewer Update',
        amount: -40.0,
        date: '2024-12-21',
        account_id: testAccountId
      };

      const response = await auth
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without team membership', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const updateData = {
        description: 'No Access Update',
        amount: -40.0,
        date: '2024-12-21',
        account_id: testAccountId
      };

      const response = await auth
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team membership', async () => {
      const auth = authenticatedRequest(superadminToken);
      const updateData = {
        description: 'Superadmin Update',
        amount: -40.0,
        date: '2024-12-21',
        account_id: testAccountId
      };

      const response = await auth
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const updateData = {
        description: 'Unauthorized Update',
        amount: -50.0,
        date: '2024-12-22',
        account_id: testAccountId
      };

      const response = await request(app)
        .put(`/api/transactions/${transactionIdToUpdate}`)
        .send(updateData);

      validateApiResponse(response, 401);
    });

    it('should return 404 when trying to modify a transaction on a book that was deleted or soft-deleted', async () => {
      const { authenticatedRequest, initializeTokenCache } = require('../utils/test-helpers');
      const tokens = await initializeTokenCache();
      const adminToken = tokens.admin;
      const superadminToken = tokens.superadmin;

      // Find a transaction for account in book 1 (team 1)
      const auth = authenticatedRequest(adminToken);
      const transactionsResponse = await auth.get('/api/books/1/transactions');
      const transaction = transactionsResponse.body[0];
      expect(transaction).toBeDefined();

      // Soft-delete book 1
      const adminAuth = authenticatedRequest(adminToken);
      await adminAuth.delete('/api/books/1');

      // Try to update the transaction
      const updateResponse = await auth.put(`/api/transactions/${transaction.id}`).send({
        description: transaction.description,
        note: transaction.note,
        amount: transaction.amount,
        date: transaction.date,
        exercised: transaction.exercised,
        account_id: transaction.account_id,
        category_id: transaction.category_id
      });
      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toHaveProperty('error');
      // Accept either "Book not found" or "Team not found" depending on implementation
      expect(updateResponse.body.error).toBe('Book not found');

      // Try to delete the transaction
      const deleteResponse = await auth.delete(`/api/transactions/${transaction.id}`);
      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body).toHaveProperty('error');
      expect(deleteResponse.body.error).toBe('Book not found');
      await resetDatabase(); // Clean up after test
    });

    it('should return 404 when trying to modify a transaction on a team that was deleted or soft-deleted', async () => {
      const { authenticatedRequest, initializeTokenCache } = require('../utils/test-helpers');
      const tokens = await initializeTokenCache();
      const adminToken = tokens.admin;
      const superadminToken = tokens.superadmin;

      // Find a transaction for account in book 1 (team 1)
      const auth = authenticatedRequest(adminToken);
      const transactionsResponse = await auth.get('/api/books/1/transactions');
      const transaction = transactionsResponse.body[0];
      expect(transaction).toBeDefined();

      // Soft-delete team 1 (which owns book 1)
      const superAuth = authenticatedRequest(superadminToken);
      await superAuth.delete('/api/teams/1');

      // Try to update the transaction
      const updateResponse = await auth.put(`/api/transactions/${transaction.id}`).send({
        description: transaction.description,
        note: transaction.note,
        amount: transaction.amount,
        date: transaction.date,
        exercised: transaction.exercised,
        account_id: transaction.account_id,
        category_id: transaction.category_id
      });
      expect(updateResponse.status).toBe(404);
      expect(updateResponse.body).toHaveProperty('error');
      // Accept either "Book not found" or "Team not found" depending on implementation
      expect(updateResponse.body.error).toBe('Book not found');

      // Try to delete the transaction
      const deleteResponse = await auth.delete(`/api/transactions/${transaction.id}`);
      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body).toHaveProperty('error');
      expect(deleteResponse.body.error).toBe('Book not found');
      await resetDatabase(); // Clean up after test
    });

    it('should return 400 if no updatable fields are provided for update', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create a transaction to update
      const createResponse = await auth.post('/api/transactions').send({
        description: 'Transaction for update field check',
        amount: -12.0,
        date: '2024-12-29',
        exercised: false,
        account_id: testAccountId
      });
      const transactionId = createResponse.body.id;

      // Try to update with no updatable fields
      const response = await auth.put(`/api/transactions/${transactionId}`).send({});

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty(
        'error',
        'At least one field must be provided for update'
      );
    });

    it('should return 400 for invalid date when updating a transaction', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create a transaction to update
      const createResponse = await auth.post('/api/transactions').send({
        description: 'Transaction for invalid date test',
        amount: -22.0,
        date: '2024-12-30',
        exercised: false,
        account_id: testAccountId
      });
      const transactionId = createResponse.body.id;

      // Try to update with an invalid date
      const response = await auth.put(`/api/transactions/${transactionId}`).send({
        date: 'invalid-date'
      });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should return 404 for updating to a non-existent account', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create a transaction to update
      const createResponse = await auth.post('/api/transactions').send({
        description: 'Transaction for non-existent account update',
        amount: -18.0,
        date: '2024-12-31',
        exercised: false,
        account_id: testAccountId
      });
      const transactionId = createResponse.body.id;

      // Try to update with a non-existent account_id
      const response = await auth.put(`/api/transactions/${transactionId}`).send({
        account_id: 99999
      });

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Account not found');
    });

    it('should return 404 for updating to a non-existent category', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create a transaction to update
      const createResponse = await auth.post('/api/transactions').send({
        description: 'Transaction for non-existent category update',
        amount: -19.0,
        date: '2024-12-31',
        exercised: false,
        account_id: testAccountId
      });
      const transactionId = createResponse.body.id;

      // Try to update with a non-existent category_id
      const response = await auth.put(`/api/transactions/${transactionId}`).send({
        category_id: 99999
      });

      validateApiResponse(response, 404);
      expect(response.body).toHaveProperty('error', 'Category not found');
    });

    it('should return 400 if category does not belong to the same book as the account', async () => {
      const auth = authenticatedRequest(adminToken);

      // Create a transaction to update
      const createResponse = await auth.post('/api/transactions').send({
        description: 'Transaction for category-book mismatch',
        amount: -21.0,
        date: '2024-12-31',
        exercised: false,
        account_id: testAccountId
      });
      const transactionId = createResponse.body.id;

      // Use a category from a different book (e.g., category_id: 3 is in book 2)
      const response = await auth.put(`/api/transactions/${transactionId}`).send({
        category_id: 3
      });

      validateApiResponse(response, 400);
      expect(response.body).toHaveProperty(
        'error',
        'Category must belong to the same book as the account'
      );
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    let transactionIdToDelete;

    beforeEach(async () => {
      // Create a transaction to delete
      const auth = authenticatedRequest(adminToken);
      const transactionData = {
        description: 'Transaction to Delete',
        amount: -35.0,
        date: '2024-12-23',
        exercised: false,
        account_id: testAccountId
      };

      const response = await auth.post('/api/transactions').send(transactionData);

      transactionIdToDelete = response.body.id;
    });

    it('should delete transaction as admin', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 204);

      // Verify transaction is deleted
      const getResponse = await auth.get(`/api/transactions/${transactionIdToDelete}`);
      validateApiResponse(getResponse, 404);
    });

    it('should return 404 for non-existent transaction', async () => {
      const auth = authenticatedRequest(adminToken);
      const response = await auth.delete('/api/transactions/99999');

      validateApiResponse(response, 404);
      expect(response.body.error).toContain('Transaction not found');
    });

    it('should allow collaborator to delete transaction', async () => {
      const auth = authenticatedRequest(collaboratorToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 204);
    });

    it('should deny viewer access to delete transaction', async () => {
      const auth = authenticatedRequest(viewerToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without team membership', async () => {
      const auth = authenticatedRequest(noaccessToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny superadmin access without team membership', async () => {
      const auth = authenticatedRequest(superadminToken);
      const response = await auth.delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).delete(`/api/transactions/${transactionIdToDelete}`);

      validateApiResponse(response, 401);
    });
  });
});
