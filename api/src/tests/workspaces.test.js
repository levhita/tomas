const request = require('supertest');
const db = require('../db');
const workspaceUtils = require('../utils/workspace');

// Mock Express app and req.user
const express = require('express');
const app = express();

// Mock user for authentication
const mockUser = { id: 1, username: 'testuser' };

// Mock middleware to inject user into request
app.use((req, res, next) => {
  req.user = mockUser;
  next();
});

// Import and use the router
const workspacesRouter = require('../routes/workspaces');
app.use('/workspaces', workspacesRouter);

// Mock the database module
jest.mock('../db');

describe('Workspaces API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /workspaces', () => {
    test('returns list of workspaces for authenticated user', async () => {
      // Mock database response
      const mockWorkspaces = [
        {
          id: 1,
          name: 'Personal Finance',
          description: 'My personal budget',
          currency_symbol: '$',
          week_start: 'monday',
          created_at: '2023-01-01T00:00:00.000Z',
          deleted_at: null
        },
        {
          id: 2,
          name: 'Business Expenses',
          description: 'Company expenses tracking',
          currency_symbol: '€',
          week_start: 'monday',
          created_at: '2023-02-15T00:00:00.000Z',
          deleted_at: null
        }
      ];

      db.query.mockResolvedValue([mockWorkspaces]);

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockWorkspaces);
      expect(response.body.length).toBe(2);

      // Verify correct query parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT w.*'),
        [mockUser.id]
      );
    });

    test('only returns non-deleted workspaces', async () => {
      db.query.mockResolvedValue([[
        { id: 1, name: 'Active Workspace', deleted_at: null }
      ]]);

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(200);

      // Verify query includes deleted_at filter
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('w.deleted_at IS NULL'),
        expect.anything()
      );
    });

    test('returns workspaces sorted by name', async () => {
      const sortedWorkspaces = [
        { id: 3, name: 'Accounting' },
        { id: 1, name: 'Budget' },
        { id: 2, name: 'Expenses' }
      ];

      db.query.mockResolvedValue([sortedWorkspaces]);

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(sortedWorkspaces);

      // Verify sort order in query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY w.name ASC'),
        expect.anything()
      );
    });

    test('only returns workspaces where user is a member', async () => {
      db.query.mockResolvedValue([[]]);

      await request(app).get('/workspaces');

      // Verify user filter in query
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN workspace_user wu ON w.id = wu.workspace_id'),
        expect.anything()
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('wu.user_id = ?'),
        [mockUser.id]
      );
    });

    test('returns empty array when user has no workspaces', async () => {
      db.query.mockResolvedValue([[]]);

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test('handles database error with 500 response', async () => {
      // Simulate database error
      db.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch workspaces');
    });

    test('preserves all workspace properties in response', async () => {
      // Mock a complete workspace object based on schema
      const completeWorkspace = {
        id: 1,
        name: 'Complete Workspace',
        description: 'Has all properties',
        currency_symbol: '¥',
        week_start: 'sunday',
        created_at: '2023-03-10T12:34:56.000Z',
        deleted_at: null
      };

      db.query.mockResolvedValue([[completeWorkspace]]);

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject(completeWorkspace);

      // Verify specific important properties
      expect(response.body[0]).toHaveProperty('currency_symbol', '¥');
      expect(response.body[0]).toHaveProperty('week_start', 'sunday');
      expect(response.body[0]).toHaveProperty('created_at');
    });

    test('properly joins with workspace_user table', async () => {
      db.query.mockResolvedValue([[]]);

      await request(app).get('/workspaces');

      const queryString = db.query.mock.calls[0][0];

      // Check for proper JOIN syntax
      expect(queryString).toMatch(/INNER JOIN workspace_user wu ON w\.id = wu\.workspace_id/i);
    });

    test('handles database timeout gracefully', async () => {
      // Simulate a database timeout
      db.query.mockRejectedValue(new Error('Database query timeout'));

      const response = await request(app).get('/workspaces');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    test('logs database errors to console', async () => {
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate database error
      const error = new Error('Database query failed');
      db.query.mockRejectedValue(error);

      await request(app).get('/workspaces');

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Database error:', error);

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});
