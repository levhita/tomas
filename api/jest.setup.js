// Mock database module
jest.mock('./src/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
}));

// Mock workspace utils
jest.mock('./src/utils/workspace', () => ({
  canAdmin: jest.fn(),
  canWrite: jest.fn(),
  canRead: jest.fn(),
  getWorkspaceUsers: jest.fn(),
  getWorkspaceById: jest.fn()
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global Express app mock for testing routes
global.mockUser = { id: 1, username: 'testuser', admin: false };

// Create a mock Express app for testing
const express = require('express');
const app = express();

// Add middleware to inject mock user
app.use((req, res, next) => {
  req.user = global.mockUser;
  next();
});

// Load routes to test
const workspacesRouter = require('./src/routes/workspaces');
app.use('/workspaces', workspacesRouter);

global.app = app;