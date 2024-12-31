const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const db = new Database(path.join(__dirname, './db/database.sqlite3'), {
  verbose: console.log, // Log SQL queries in development
  fileMustExist: false // Create db file if it doesn't exist
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Handle uncaught errors
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = db;