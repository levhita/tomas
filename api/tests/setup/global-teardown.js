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
    // Clean up test data (optional - could leave for debugging)
    const tables = ['transaction', 'total', 'category', 'account', 'workspace_user', 'workspace', 'user'];

    for (const table of tables) {
      try {
        await connection.execute(`DELETE FROM ${table}`);
      } catch (error) {
        // Ignore errors if tables don't exist
        console.warn(`Warning cleaning table ${table}: ${error.message}`);
      }
    }

    console.log('✅ Test database cleanup complete');
  } catch (error) {
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
