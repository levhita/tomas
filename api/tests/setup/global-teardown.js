/**
 * Global Test Teardown
 * 
 * This file runs after all tests and cleans up the test database.
 */

const mysql = require('mysql2/promise');

module.exports = async () => {
  // Load environment variables
  require('dotenv').config();

  console.log('🧹 Cleaning up test database...');

  // Create connection to database
  const connection = await mysql.createConnection({
    host: process.env.YAMO_MYSQL_HOST,
    user: process.env.YAMO_MYSQL_USER,
    password: process.env.YAMO_MYSQL_PASSWORD,
    port: process.env.YAMO_MYSQL_PORT,
    database: process.env.YAMO_MYSQL_DATABASE
  });

  try {
    // Temporarily disable foreign key checks to handle circular references
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Clean up test data in correct order (children before parents)
    const tables = [
      'transaction',    // references account, category
      'total',          // references account
      'category',       // references category (self), book  
      'account',        // references book
      'book_user', // references book, user
      'book',      // referenced by account, category, book_user
      'user'           // referenced by book_user
    ];

    for (const table of tables) {
      try {
        await connection.execute(`DELETE FROM ${table}`);
      } catch (error) {
        // Ignore errors if tables don't exist
        console.warn(`Warning cleaning table ${table}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Test database cleanup complete');
  } catch (error) {
    // Make sure to re-enable foreign key checks even if there's an error
    try {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    } catch (fkError) {
      // Ignore FK re-enable errors during cleanup
    }
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    await connection.end();
  }

  // Close the database pool from the app if it exists
  try {
    const db = require('../../src/db');
    if (db && typeof db.end === 'function') {
      await db.end();
      console.log('✅ Database pool closed');
    }
  } catch (error) {
    console.warn('Warning closing database pool:', error.message);
  }
};
