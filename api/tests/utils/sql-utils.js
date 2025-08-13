/**
 * SQL Utilities for Tests
 *
 * Provides functions for parsing and executing SQL scripts
 * Used by both global-setup.js and test-helpers.js
 */

/**
 * Parse SQL script into executable statements
 * @param {string} script - SQL script with multiple statements
 * @returns {string[]} Array of parsed SQL statements
 */
function parseScript(script) {
  // Split the script into individual statements (separated by semicolons)
  const statements = script
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  let cleanStatements = [];

  statements.forEach((statement) => {
    const lines = statement.split('\n').filter((line) => line.length > 0);
    const cleanedStatement = lines.filter((line) => !line.startsWith('--')).join('\n');
    if (cleanedStatement.length > 0) cleanStatements.push(cleanedStatement);
  });

  return cleanStatements;
}

/**
 * Execute a SQL script using the provided database connection
 * @param {object} dbConnection - MySQL connection
 * @param {string} script - SQL script content
 * @param {string} scriptType - Type of script for logging (e.g. 'schema', 'seed')
 * @param {boolean} failOnError - Whether to fail immediately on error
 * @returns {Promise<void>}
 */
async function executeScript(dbConnection, script, scriptType = 'SQL', failOnError = false) {
  const statements = parseScript(script);

  // console.log(`Found ${statements.length} ${scriptType} statements to execute`);

  // Execute each statement individually
  for (const statement of statements) {
    try {
      // Log important operations
      if (
        statement.toLowerCase().startsWith('create table') ||
        statement.toLowerCase().startsWith('drop table')
      ) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
      }

      await dbConnection.query(statement);
    } catch (error) {
      // Always log the error
      console.error(`Error executing ${scriptType} statement: ${error.message}`);
      console.error(`Statement: ${statement.substring(0, 100)}...`);

      // Either fail or continue based on configuration
      if (failOnError) {
        throw error;
      }

      // Skip non-critical errors
      if (!error.message.includes("doesn't exist") && !error.message.includes('Unknown table')) {
        console.warn(`Warning: Continuing despite error in ${scriptType} statement`);
      }
    }
  }
}

module.exports = {
  parseScript,
  executeScript
};
