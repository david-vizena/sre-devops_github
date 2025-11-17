/**
 * JWT Authentication Middleware
 * Validates JWT tokens from Authorization header
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8085';

/**
 * Middleware to validate JWT token
 */
async function authenticateToken(req, res, next) {
  // Skip authentication for health and metrics endpoints
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // Skip authentication for auth endpoints (they handle their own auth)
  if (req.path.startsWith('/v1/auth/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'No token provided. Include Authorization: Bearer <token> header.',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Option 1: Validate locally (faster)
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Option 2: Validate via auth service (more secure, can check revocation)
    try {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/v1/validate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.valid) {
        req.user = response.data.user;
        next();
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (validationError) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      console.error('Token validation error:', validationError.message);
      return res.status(401).json({ error: 'Token validation failed' });
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token, but adds user if token is valid
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Ignore errors for optional auth
    }
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
};

