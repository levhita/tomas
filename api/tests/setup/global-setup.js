/**
 * Global Test Setup
 * 
 * This file runs before all tests and it creates a separate test
 * database and applies the test schema.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const { executeScript } = require('../utils/sql-utils');

module.exports = async () => {
  // Load test environment variables first
  require('dotenv').config({ path: '.env.test' });

  // Set test environment variables
  process.env.NODE_ENV = 'test';

  console.log('🔧 Setting up test database...');
  console.log(`Database: ${process.env.YAMO_MYSQL_DATABASE}`);
  console.log(`Host: ${process.env.YAMO_MYSQL_HOST}`);
  console.log(`User: ${process.env.YAMO_MYSQL_USER}`);

  // Create connection to existing database
  const connection = await mysql.createConnection({
    host: process.env.YAMO_MYSQL_HOST,
    user: process.env.YAMO_MYSQL_USER,
    password: process.env.YAMO_MYSQL_PASSWORD,
    port: process.env.YAMO_MYSQL_PORT,
    database: process.env.YAMO_MYSQL_DATABASE,
    multipleStatements: true
  });

  try {
    // Read schema files
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const seedsPath = path.join(__dirname, '../../db/test_seeds.sql');
    
    console.log('🔄 Recreating tables with test data...');
    
    // Execute schema and seed scripts using the shared utility
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await executeScript(connection, schemaSql, 'schema');

    const seedsSql = await fs.readFile(seedsPath, 'utf8');
    await executeScript(connection, seedsSql, 'seed');

    // Verify database state
    // Check if users were inserted
    const [users] = await connection.execute('SELECT * FROM user');
    // console.log(`Inserted ${users.length} users`);

    // Check if teams were inserted
    const [teams] = await connection.execute('SELECT * FROM team');
    // console.log(`Inserted ${teams.length} teams`);

    // Check if books were inserted
    const [books] = await connection.execute('SELECT * FROM book');
    // console.log(`Inserted ${books.length} books`);

    // Check if accounts were inserted
    const [accounts] = await connection.execute('SELECT * FROM account');
    // console.log(`Inserted ${accounts.length} accounts`);

    // Check if categories were inserted
    const [categories] = await connection.execute('SELECT * FROM category');
    // console.log(`Inserted ${categories.length} categories`);

    // Check if transactions were inserted
    const [transactions] = await connection.execute('SELECT * FROM transaction');
    // console.log(`Inserted ${transactions.length} transactions`);

    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};
