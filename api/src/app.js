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
const booksRouter = require('./routes/books');

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

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('Malformed JSON in request body for path:', req.path);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next(err);
});
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
 * - /api/books: Multi-tenant book management (booksRouter)
 */
app.use('/api', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/health', healthRouter);
app.use('/api/books', booksRouter);

/**
 * Static File Serving
 * 
 * Serve static files (HTML, CSS, JS, images) from the 'public' directory.
 * This is used for the frontend Single Page Application.
 */
app.use(express.static('public'));

// Error handler middleware for any unhandled errors
app.use((err, req, res, next) => {
  // Log the error for debugging but don't expose details to client
  console.log('Unhandled error for path:', req.path, err.message);

  if (req.path.startsWith('/api')) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).send('Internal server error');
  }
});

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
    // Try to serve the SPA index.html file
    res.sendFile('public/index.html', { root: '.' }, (err) => {
      if (err) {
        // SPA index.html not found, log and return 404
        console.log('SPA index file not found for path:', req.path);
        res.status(404).send('Page not found');
      }
    });
  } else {
    // API route not found
    console.log('API endpoint not found:', req.path);
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

module.exports = app;
