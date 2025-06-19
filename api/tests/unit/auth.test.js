/**
 * Authentication Middleware Unit Tests
 * 
 * Tests the JWT authentication middleware functionality.
 */

const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../src/middleware/auth');

// Express request and response mock objects
const mockRequest = (authHeader = null, path = '/test') => ({
  headers: {
    authorization: authHeader
  },
  path
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid JWT token', async () => {
      // Use real test data - testuser1 (id: 2) is a regular user
      const payload = { userId: 2, username: 'testuser1', superadmin: false };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(2);
      expect(req.user.username).toBe('testuser1');
      expect(req.user.superadmin).toBe(false);
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject token without superadmin claim', async () => {
      // Use real test data - testuser1 but omit superadmin claim
      const payload = { userId: 2, username: 'testuser1' }; // Missing superadmin claim
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', async () => {
      const req = mockRequest('InvalidHeader');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authorization header without Bearer prefix', async () => {
      const token = jwt.sign({ userId: 1 }, process.env.YAMO_JWT_SECRET);
      const req = mockRequest(`Basic ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      const req = mockRequest('Bearer invalid-token');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired JWT token', async () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET, { expiresIn: '-1h' });

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token signed with wrong secret', async () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, 'wrong-secret');

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token with additional claims', async () => {
      // Use real test data - superadmin (id: 1)
      const payload = {
        userId: 1,
        username: 'superadmin',
        superadmin: true,
        customClaim: 'custom-value'
      };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.username).toBe('superadmin');
      expect(req.user.superadmin).toBe(true);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle empty token after Bearer', async () => {
      const req = mockRequest('Bearer ');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      // Use non-existent user data - this will fail database lookup
      const payload = { userId: 999, username: 'nonexistent', superadmin: false };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token with mismatched superadmin claim', async () => {
      // Create token claiming testuser1 (id: 2) is superadmin, but in DB they're not
      const payload = { userId: 2, username: 'testuser1', superadmin: true };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access to public endpoints without token', async () => {
      const req = mockRequest(null, '/health');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access to login endpoint without token', async () => {
      const req = mockRequest(null, '/users/login');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access to root endpoint without token', async () => {
      const req = mockRequest(null, '/');
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
