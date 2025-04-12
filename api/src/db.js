/**
 * Database Connection Module
 * 
 * This module establishes and manages the MySQL database connection for the Yamo API.
 * It creates a connection pool for efficient database operations and handles graceful
 * cleanup during application shutdown.
 * 
 * Configuration is sourced from environment variables, allowing for different
 * database settings across development, testing, and production environments.
 */

const mysql = require('mysql2/promise');

/**
 * MySQL Connection Pool Configuration
 * 
 * Creates a pool of database connections with the following settings:
 * 
 * @property {string} host - Database server hostname (from YAMO_MYSQL_HOST)
 * @property {string} user - Database username (from YAMO_MYSQL_USER)
 * @property {string} password - Database password (from YAMO_MYSQL_PASSWORD)
 * @property {number} port - Database server port (from YAMO_MYSQL_PORT)
 * @property {string} database - Database name (from YAMO_MYSQL_DATABASE)
 * @property {boolean} waitForConnections - Whether to wait for connections when pool is full
 * @property {number} connectionLimit - Maximum number of connections in the pool
 * @property {number} maxIdle - Maximum number of idle connections in the pool
 * @property {number} idleTimeout - Time in milliseconds idle connections are kept in the pool
 * @property {number} queueLimit - Maximum queue size (0 = unlimited)
 * @property {boolean} dateStrings - Return DATE/DATETIME as strings instead of Date objects
 * @property {boolean} enableKeepAlive - Whether to enable keep-alive functionality
 * @property {number} keepAliveInitialDelay - Initial delay before keep-alive probe
 * @property {boolean} decimalNumbers - Return DECIMAL/NUMERIC as JavaScript numbers
 */
const db = mysql.createPool({
  host: process.env.YAMO_MYSQL_HOST,
  user: process.env.YAMO_MYSQL_USER,
  password: process.env.YAMO_MYSQL_PASSWORD,
  port: process.env.YAMO_MYSQL_PORT,
  database: process.env.YAMO_MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 120000,
  queueLimit: 0,
  dateStrings: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true,
});

/**
 * Graceful Shutdown Handlers
 * 
 * These event listeners ensure that database connections are properly closed
 * when the application terminates, preventing connection leaks and ensuring
 * data integrity.
 * 
 * - 'exit': Normal process termination
 * - 'SIGHUP': Terminal closed or parent process died (signal 1)
 * - 'SIGINT': User interrupt (Ctrl+C) (signal 2)
 * - 'SIGTERM': Process termination request (signal 15)
 * 
 * The process.exit() calls use standard Unix exit codes:
 * 128 + signal number is the convention for signal-initiated exits.
 */
process.on('exit', async () => await db.end());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

/**
 * Database Connection Pool Export
 * 
 * This pool is used throughout the application for database operations.
 * It provides methods like:
 * - db.query(): Execute SQL queries
 * - db.execute(): Execute prepared statements
 * - db.getConnection(): Get a dedicated connection from the pool
 * - db.end(): Close all connections in the pool
 * 
 * Usage example:
 * const [rows, fields] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
 */
module.exports = db;