const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.YAMO_MYSQL_HOST,
  user: process.env.YAMO_MYSQL_USER,
  password: process.env.YAMO_MYSQL_PASSWORD,
  port: process.env.YAMO_MYSQL_PORT,
  database: process.env.YAMO_MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0
});

// Handle uncaught errors
process.on('exit', async () => await db.end());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = db;