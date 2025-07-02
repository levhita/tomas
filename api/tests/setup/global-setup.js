/**
 * Global Test Setup
 * 
 * This file runs before all tests an    console.log(`Found ${seedStatements.length} seed statements to execute`);

    // Execute all statements in sequence: schema first, then seeds
    const allStatements = [...schemaStatements, ...seedStatements];

    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i];
      try {
        await connection.execute(statement);
        if (statement.toLowerCase().startsWith('create table') ||
          statement.toLowerCase().startsWith('drop table')) {
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        }
      } catch (error) {
        // Log but don't fail on non-critical errors
        if (!error.message.includes("doesn't exist") &&
          !error.message.includes("Unknown table")) {
          console.warn(`Warning on statement ${i + 1}: ${error.message}`);
          console.warn(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }database environment.
 * It creates a separate test database and applies the test schema.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

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

    const schema = await fs.readFile(schemaPath, 'utf8');
    const seeds = await fs.readFile(seedsPath, 'utf8');

    console.log('🔄 Recreating tables with test data...');

    // Process schema statements first
    const schemaStatements = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${schemaStatements.length} schema statements to execute`);

    // Then process seed statements
    const seedStatements = seeds
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${seedStatements.length} seed statements to execute`);

    // Execute all statements in sequence: schema first, then seeds
    const allStatements = [...schemaStatements, ...seedStatements];

    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i];
      try {
        await connection.execute(statement);
        if (statement.toLowerCase().startsWith('create table') ||
          statement.toLowerCase().startsWith('drop table')) {
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        }
        // Special logging for book table creation
        if (statement.toLowerCase().includes('create table') && statement.toLowerCase().includes('book')) {
          console.log(`🔍 Book table creation statement executed successfully`);
        }
      } catch (error) {
        // Log but don't fail on non-critical errors
        if (!error.message.includes("doesn't exist") &&
          !error.message.includes("Unknown table")) {
          console.warn(`Warning on statement ${i + 1}: ${error.message}`);
          console.warn(`Statement: ${statement.substring(0, 100)}...`);
        }
        // Special error logging for book table
        if (statement.toLowerCase().includes('book')) {
          console.error(`❌ Error creating book table: ${error.message}`);
          console.error(`Book table statement: ${statement}`);
        }
      }
    }

    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`Created ${tables.length} tables:`, tables.map(t => Object.values(t)[0]));

    // Verify book table schema specifically
    try {
      const [bookSchema] = await connection.execute('DESCRIBE book');
      console.log(`📚 Book table schema:`, bookSchema.map(col => `${col.Field} (${col.Type})`));
    } catch (error) {
      console.error(`❌ Failed to describe book table: ${error.message}`);
    }

    // Check if users were inserted
    const [users] = await connection.execute('SELECT * FROM user');
    console.log(`Inserted ${users.length} users:`, users);

    // Check if teams were inserted
    const [teams] = await connection.execute('SELECT * FROM team');
    console.log(`Inserted ${teams.length} teams:`, teams);

    // Check if team_user assignments were inserted
    const [teamUsers] = await connection.execute('SELECT * FROM team_user');
    console.log(`Inserted ${teamUsers.length} team-user assignments:`, teamUsers);

    // Check if books were inserted
    const [books] = await connection.execute('SELECT * FROM book');
    console.log(`Inserted ${books.length} books:`, books);

    // Check if accounts were inserted
    const [accounts] = await connection.execute('SELECT * FROM account');
    console.log(`Inserted ${accounts.length} accounts:`, accounts);

    // Check if categories were inserted
    const [categories] = await connection.execute('SELECT * FROM category');
    console.log(`Inserted ${categories.length} categories:`, categories);

    // Check if transactions were inserted
    const [transactions] = await connection.execute('SELECT * FROM transaction');
    console.log(`Inserted ${transactions.length} transactions:`, transactions);

    console.log('✅ Test database setup complete');

  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};
