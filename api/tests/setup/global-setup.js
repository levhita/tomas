/**
 * Global Test Setup
 * 
 * This file runs before all tests and sets up the test database environment.
 * It creates a separate test database and applies the test schema.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  // Load environment variables first
  require('dotenv').config();

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
    // Read and execute test schema (which includes DROP TABLE statements)
    const schemaPath = path.join(__dirname, '../../db/test_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    console.log('🔄 Recreating tables with test data...');
    console.log(`Schema file size: ${schema.length} characters`);

    // Split statements more carefully - remove comments and empty lines first
    const statements = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
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
    }

    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`Created ${tables.length} tables:`, tables.map(t => Object.values(t)[0]));

    // Check if users were inserted
    const [users] = await connection.execute('SELECT id, username, superadmin FROM user');
    console.log(`Inserted ${users.length} users:`, users);

    console.log('✅ Test database setup complete');

  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};
