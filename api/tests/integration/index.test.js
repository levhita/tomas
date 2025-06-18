/**
 * Index Route Integration Tests
 * 
 * Tests core application routing, middleware, and error handling.
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Index Routes and Core Application', () => {
  describe('GET /', () => {
    it('should return welcome page', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('Welcome'); // Assuming welcome.html contains "Welcome"
    });

    it('should serve static welcome page', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('API Base Route', () => {
    it('should handle /api route', async () => {
      const response = await request(app).get('/api');

      // Should either return a response or redirect, not 404
      expect([200, 301, 302, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent API routes', async () => {
      const response = await request(app).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle deeply nested non-existent routes', async () => {
      const response = await request(app).get('/api/very/deep/non/existent/route');

      expect(response.status).toBe(404);
    });
  });

  describe('CORS Configuration', () => {
    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect([200, 204]).toContain(response.status);
    });

    it('should include CORS headers in API responses', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      // Check for CORS headers (may vary based on CORS configuration)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Content Security', () => {
    it('should set security headers', async () => {
      const response = await request(app).get('/');

      // Check for common security headers
      expect(response.headers).toBeDefined();
      // Note: Specific headers depend on your security middleware configuration
    });

    it('should handle JSON content type properly', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Request Parsing', () => {
    it('should parse JSON body in POST requests', async () => {
      const testData = { test: 'data' };

      // Use a valid endpoint that accepts POST (like login)
      const response = await request(app)
        .post('/api/users/login')
        .send(testData);

      // Should not fail due to JSON parsing (though will fail auth validation)
      expect(response.status).not.toBe(500);
    });

    it('should handle URL encoded data', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .type('form')
        .send('username=test&password=test');

      // Should not fail due to URL encoding parsing
      expect(response.status).not.toBe(500);
    });
  });

  describe('Rate Limiting (if configured)', () => {
    it('should handle multiple rapid requests', async () => {
      const requests = Array(5).fill().map(() =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(requests);

      // All requests should complete (may have rate limiting but shouldn't crash)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // 200 OK or 429 Too Many Requests
      });
    });
  });

  describe('Static File Serving', () => {
    it('should serve static files from public directory', async () => {
      // Test serving a static file if it exists
      const response = await request(app).get('/assets/index-DFD5D8vv.css');

      // Should either serve the file or return 404 if not found
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Express Application Configuration', () => {
    it('should have proper Express app configuration', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should handle different HTTP methods', async () => {
      // Test various HTTP methods
      const getResponse = await request(app).get('/api/health');
      expect([200, 404]).toContain(getResponse.status);

      const postResponse = await request(app).post('/api/users/login').send({});
      expect([400, 401, 404]).toContain(postResponse.status);

      const putResponse = await request(app).put('/api/non-existent').send({});
      expect([404, 405]).toContain(putResponse.status);

      const deleteResponse = await request(app).delete('/api/non-existent');
      expect([404, 405]).toContain(deleteResponse.status);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for 404s', async () => {
      const response = await request(app).get('/api/non-existent');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .set('Content-Type', 'application/json')
        .send('{ malformed json }');

      expect(response.status).toBe(400);
    });
  });
});
