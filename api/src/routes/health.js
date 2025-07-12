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
 * @swagger
 * /health:
 *   get:
 *     summary: Performs a health check of the API and database connection
 *     description: Public endpoint for load balancers and basic monitoring. Checks API server availability and database connectivity.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API and database are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *       500:
 *         description: API or database are unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 error:
 *                   type: string
 *                   example: Database connection failed
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
 * @swagger
 * /health/admin:
 *   get:
 *     summary: Detailed health check with system information for administrators
 *     description: Provides comprehensive system metrics including memory usage, database statistics, and environment information.
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed health status with system metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-12-18T10:30:00.000Z'
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       example: 150
 *                     total:
 *                       type: number
 *                       example: 200
 *                     free:
 *                       type: number
 *                       example: 50
 *                     rss:
 *                       type: number
 *                       example: 180
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                     response_time:
 *                       type: string
 *                       example: '5ms'
 *                     connections:
 *                       type: string
 *                       example: '10'
 *                     tables:
 *                       type: number
 *                       example: 15
 *                 environment:
 *                   type: object
 *                   properties:
 *                     node_version:
 *                       type: string
 *                       example: 'v18.17.0'
 *                     platform:
 *                       type: string
 *                       example: 'linux'
 *                     arch:
 *                       type: string
 *                       example: 'x64'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: error
 *                 error:
 *                   type: string
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

/**
 * @swagger
 * /health/stats:
 *   get:
 *     summary: Get dashboard statistics for administrators
 *     description: Provides comprehensive statistics about users, teams, and books for the admin dashboard.
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics for the admin dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 150
 *                     active:
 *                       type: number
 *                       example: 120
 *                     superadmins:
 *                       type: number
 *                       example: 5
 *                 teams:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 25
 *                     active:
 *                       type: number
 *                       example: 20
 *                 books:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 45
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: Failed to retrieve statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is superadmin
    if (!req.user.superadmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    // Get user statistics
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN superadmin = 1 THEN 1 ELSE 0 END) as superadmins
      FROM user
    `);

    // Get team statistics
    const [teamStats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active
      FROM team
    `);

    // Get book statistics
    const [bookStats] = await db.execute(`
      SELECT COUNT(*) as total
      FROM book
    `);

    // Return statistics
    res.status(200).json({
      users: {
        total: userStats[0].total,
        active: userStats[0].active,
        superadmins: userStats[0].superadmins
      },
      teams: {
        total: teamStats[0].total,
        active: teamStats[0].active
      },
      books: {
        total: bookStats[0].total
      }
    });
  } catch (err) {
    console.error('Stats check failed:', err);
    res.status(500).json({
      error: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;