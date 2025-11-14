const { authenticateToken, optionalAuth } = require('./auth');

// Mock jwt
const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/v1/test',
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should skip authentication for health endpoint', async () => {
    req.path = '/health';
    await authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 if no token provided', async () => {
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
  });
});

