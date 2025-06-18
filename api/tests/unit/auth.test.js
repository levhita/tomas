/**
 * Authentication Middleware Unit Tests
 * 
 * Tests the JWT authentication middleware functionality.
 */

const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../src/middleware/auth');

// Express request and response mock objects
const mockRequest = (authHeader = null) => ({
  headers: {
    authorization: authHeader
  }
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
    it('should authenticate valid JWT token', () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.username).toBe('testuser');
      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing authorization header', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', () => {
      const req = mockRequest('InvalidHeader');
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authorization header without Bearer prefix', () => {
      const token = jwt.sign({ userId: 1 }, process.env.YAMO_JWT_SECRET);
      const req = mockRequest(`Basic ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', () => {
      const req = mockRequest('Bearer invalid-token');
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired JWT token', () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET, { expiresIn: '-1h' });

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token signed with wrong secret', () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = jwt.sign(payload, 'wrong-secret');

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token with additional claims', () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        superadmin: true,
        customClaim: 'custom-value'
      };
      const token = jwt.sign(payload, process.env.YAMO_JWT_SECRET);

      const req = mockRequest(`Bearer ${token}`);
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.username).toBe('testuser');
      expect(req.user.superadmin).toBe(true);
      expect(req.user.customClaim).toBe('custom-value');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle empty token after Bearer', () => {
      const req = mockRequest('Bearer ');
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
