const express = require('express');
require('dotenv').config();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const authenticateToken = require('./middleware/auth');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const accountsRouter = require('./routes/accounts');
const healthRouter = require('./routes/health');
const workspacesRouter = require('./routes/workspaces');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Add authentication middleware for /api routes
app.use('/api', authenticateToken);

app.use('/api', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/health', healthRouter);
app.use('/api/workspaces', workspacesRouter);

// Serve static files from public directory
app.use(express.static('public'));

// Always return index.html for any non-api routes (for SPA routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile('public/index.html', { root: '.' });
  }
});

module.exports = app;
