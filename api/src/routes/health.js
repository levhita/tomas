/**
 * Health API Router
 * Provides endpoints for monitoring and checking the application health.
 * 
 * This router provides two endpoints:
 * - Public health check for load balancers and basic monitoring
 * - Admin health check for detailed system information
 * 
 * The health checks perform basic validation of:
 * - API server availability
 * - Database connectivity
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /health
 * Performs a health check of the API and database connection
 * 
 * @permission Public endpoint - no authentication required
 * @returns {Object} Health status with 200 status code when healthy
 * @returns {Object} Error details with 500 status code when unhealthy
 * 
 * Example success response:
 * {
 *   "status": "healthy"
 * }
 * 
 * Example error response:
 * {
 *   "status": "unhealthy",
 *   "error": "Error message details"
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Simple database connectivity check
    // This verifies that the database connection is working
    // by executing a minimal query that should always succeed
    await db.query('SELECT 1');

    // Simple response for devops infrastructure
    res.status(200).json({ status: 'healthy' });
  } catch (err) {
    // Log the detailed error for debugging
    console.error('Health check failed:', err);

    // Return unhealthy status
    res.status(500).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

/**
 * GET /health/admin
 * Detailed health check with system information for administrators
 * 
 * @permission Superadmin only
 * @returns {Object} Detailed health status with system metrics
 * 
 * Example response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-12-18T10:30:00.000Z",
 *   "uptime": 3600,
 *   "memory": { ... },
 *   "database": { ... }
 * }
 */
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    // Check if user is superadmin
    if (!req.user.superadmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    // Perform detailed health checks
    const startTime = Date.now();
    await db.query('SELECT 1');
    const dbResponseTime = Date.now() - startTime;

    // Get database stats
    const [dbStats] = await db.execute('SHOW STATUS LIKE "Threads_connected"');
    const [tableStats] = await db.execute(`
      SELECT 
        COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // All checks passed, return detailed health information
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024), // MB
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
      },
      database: {
        status: 'connected',
        response_time: `${dbResponseTime}ms`,
        connections: dbStats.length > 0 ? dbStats[0].Value : 'unknown',
        tables: tableStats[0].table_count
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (err) {
    // Log the detailed error for debugging
    console.error('Admin health check failed:', err);

    // Return unhealthy status with error details for admins
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      database: {
        status: 'error'
      },
      error: err.message
    });
  }
});

module.exports = router;