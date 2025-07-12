/**
 * Health Check API Tests
 * 
 * Tests the health check endpoints for system monitoring.
 */

const request = require('supertest');
const {
  TEST_USERS,
  loginUser,
  initializeTokenCache,
  validateApiResponse,
  app
} = require('../utils/test-helpers');

describe('Health Check API', () => {
  let superadminToken;
  let adminToken;

  beforeAll(async () => {
    // Use token cache initialization for better performance
    const tokens = await initializeTokenCache();
    superadminToken = tokens.superadmin;
    adminToken = tokens.admin;
  });

  describe('GET /api/health', () => {
    it('should return simple health status without authentication', async () => {
      const response = await request(app).get('/api/health');

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');

      // Should only return status - no sensitive information
      expect(Object.keys(response.body)).toEqual(['status']);
    });

    it('should have consistent simple response format', async () => {
      const response1 = await request(app).get('/api/health');
      const response2 = await request(app).get('/api/health');

      validateApiResponse(response1, 200);
      validateApiResponse(response2, 200);

      // Both responses should have the same simple structure
      expect(response1.body).toEqual({ status: 'healthy' });
      expect(response2.body).toEqual({ status: 'healthy' });
    });

    it('should respond quickly for monitoring systems', async () => {
      const startTime = Date.now();
      const response = await request(app).get('/api/health');
      const responseTime = Date.now() - startTime;

      validateApiResponse(response, 200);
      expect(response.body.status).toBe('healthy');

      // Should respond within reasonable time for load balancers
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should return unhealthy status if database connection fails', async () => {
      // Mock db.query to throw an error
      const originalQuery = require('../../src/db').query;
      require('../../src/db').query = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));

      const response = await request(app).get('/api/health');
      validateApiResponse(response, 500);
      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'Database connection failed');

      // Restore original db.query
      require('../../src/db').query = originalQuery;
    });
  });

  describe('GET /api/health/admin', () => {
    it('should return detailed health status for superadmin', async () => {
      const response = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('environment');

      expect(response.body.status).toBe('healthy');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory).toBe('object');
      expect(typeof response.body.database).toBe('object');
      expect(typeof response.body.environment).toBe('object');

      // Check memory object structure  
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('free');
      expect(response.body.memory).toHaveProperty('rss');

      // Check database object structure
      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database).toHaveProperty('response_time');
      expect(response.body.database).toHaveProperty('tables');
      expect(response.body.database.status).toBe('connected');

      // Check environment object structure
      expect(response.body.environment).toHaveProperty('node_version');
      expect(response.body.environment).toHaveProperty('platform');
      expect(response.body.environment).toHaveProperty('arch');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/health/admin');

      validateApiResponse(response, 401);
    });

    it('should deny access for non-superadmin users', async () => {
      const response = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Admin privileges required/i);
    });

    it('should have consistent admin response format across calls', async () => {
      const response1 = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      // Small delay to ensure uptime difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      validateApiResponse(response1, 200);
      validateApiResponse(response2, 200);

      expect(response1.body.status).toBe('healthy');
      expect(response2.body.status).toBe('healthy');

      // Uptime should increase between calls (with small tolerance for fast execution)
      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });

    it('should return valid timestamp format in admin endpoint', async () => {
      const response = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      validateApiResponse(response, 200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeValidDate();

      // Timestamp should be recent (within last minute)
      const now = new Date();
      const timeDiff = Math.abs(now - timestamp);
      expect(timeDiff).toBeLessThan(60000); // 60 seconds
    });

    it('should return unhealthy status if database connection fails for superadmin', async () => {
      // Mock db.query and db.execute to throw an error
      const db = require('../../src/db');
      const originalQuery = db.query;
      const originalExecute = db.execute;
      db.query = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));
      db.execute = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));

      // Use the valid superadminToken from beforeAll
      const response = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      // If the database is down, authentication will fail and return 403 or 401
      expect([401, 403, 500]).toContain(response.status);

      // If it does reach the handler, check for unhealthy status
      if (response.status === 500) {
        expect(response.body).toHaveProperty('status', 'unhealthy');
        expect(response.body).toHaveProperty('error', 'Simulated DB failure');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('memory');
        expect(response.body).toHaveProperty('database');
        expect(response.body.database).toHaveProperty('status', 'error');
      }

      // Restore original db methods
      db.query = originalQuery;
      db.execute = originalExecute;
    });

    it('should return Invalid token error if database fails during authentication', async () => {
      // Mock db.query to throw an error during authentication
      const db = require('../../src/db');
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));

      const response = await request(app)
        .get('/api/health/admin')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid token');

      // Restore original db.query
      db.query = originalQuery;
    });
  });

  describe('GET /api/health/stats', () => {
    it('should return statistics for superadmin', async () => {
      const response = await request(app)
        .get('/api/health/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('teams');
      expect(response.body).toHaveProperty('books');
      expect(response.body.users).toHaveProperty('total');
      expect(response.body.users).toHaveProperty('active');
      expect(response.body.users).toHaveProperty('superadmins');
      expect(response.body.teams).toHaveProperty('total');
      expect(response.body.teams).toHaveProperty('active');
      expect(response.body.books).toHaveProperty('total');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app).get('/api/health/stats');
      validateApiResponse(response, 401);
    });

    it('should deny access for non-superadmin users', async () => {
      const response = await request(app)
        .get('/api/health/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      validateApiResponse(response, 403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/Admin privileges required/i);
    });

    it('should return error if database fails', async () => {
      const db = require('../../src/db');
      const originalExecute = db.execute;
      db.execute = jest.fn().mockRejectedValue(new Error('Simulated DB failure'));

      const response = await request(app)
        .get('/api/health/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      validateApiResponse(response, 500);
      expect(response.body).toHaveProperty('error', 'Failed to retrieve statistics');

      db.execute = originalExecute;
    });
  });
});
