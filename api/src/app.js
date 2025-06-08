/**
 * Yamo API Application
 * 
 * This is the main Express application configuration file that:
 * - Sets up middleware for the Express app
 * - Configures API routes and authentication
 * - Handles SPA (Single Page Application) routing
 * - Serves static files
 * 
 * The application follows a RESTful API structure with:
 * - All API routes prefixed with '/api'
 * - Authentication required for most endpoints
 * - Public health check endpoint
 * - SPA fallback for frontend routing
 */

const express = require('express');
require('dotenv').config(); // Load environment variables from .env file
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { authenticateToken } = require('./middleware/auth');

// Import route handlers
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const accountsRouter = require('./routes/accounts');
const healthRouter = require('./routes/health');
const workspacesRouter = require('./routes/workspaces');

// Initialize Express application
const app = express();

/**
 * Middleware Configuration
 * 
 * logger: HTTP request logging
 * express.json: Parse JSON request bodies
 * express.urlencoded: Parse URL-encoded request bodies
 * cookieParser: Parse cookies from requests
 * express.static: Serve static files from 'public' directory
 */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Authentication Middleware
 * 
 * Apply JWT authentication to all API routes.
 * This checks for a valid token in the Authorization header.
 * 
 * Note: Some specific routes like /api/health and /api/users/login
 * bypass this middleware with their own handlers.
 */
app.use('/api', authenticateToken);

/**
 * API Routes Configuration
 * 
 * All API routes are prefixed with '/api' and mapped to their respective routers.
 * Each router handles a specific resource or feature set:
 * 
 * - /api/: Welcome page and API information (indexRouter)
 * - /api/users: User management and authentication (usersRouter)
 * - /api/transactions: Financial transaction CRUD operations (transactionsRouter)
 * - /api/categories: Transaction categorization (categoriesRouter)
 * - /api/accounts: Financial accounts management (accountsRouter)
 * - /api/health: System health monitoring (healthRouter)
 * - /api/workspaces: Multi-tenant workspace management (workspacesRouter)
 */
app.use('/api', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/health', healthRouter);
app.use('/api/workspaces', workspacesRouter);

/**
 * Static File Serving
 * 
 * Serve static files (HTML, CSS, JS, images) from the 'public' directory.
 * This is used for the frontend Single Page Application.
 */
app.use(express.static('public'));

/**
 * SPA Fallback Route
 * 
 * For any non-API route that doesn't match a static file,
 * serve the main index.html file to support client-side routing.
 * 
 * This allows the frontend SPA to handle its own routing while
 * the API handles data operations.
 */
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile('public/index.html', { root: '.' });
  }
});

module.exports = app;
