/**
 * Health API Router
 * Provides endpoints for monitoring and checking the application health.
 * 
 * This router is primarily used for:
 * - Kubernetes or other container health checks
 * - Load balancer health probes
 * - Monitoring system integration
 * - DevOps tooling to verify service availability
 * 
 * The health check performs basic validation of:
 * - API server availability
 * - Database connectivity
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

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

    // All checks passed, return healthy status
    res.status(200).json({ status: 'healthy' });
  } catch (err) {
    // Log the detailed error for debugging
    console.error('Health check failed:', err);

    // Return unhealthy status with error details
    // This helps diagnostics when the health check fails
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

module.exports = router;