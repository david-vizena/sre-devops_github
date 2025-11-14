/**
 * Authentication Service
 * Handles user registration, login, and JWT token generation/validation
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8085;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// In-memory user store (in production, use a database)
const users = new Map();

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

/**
 * User registration endpoint
 */
app.post('/api/v1/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    if (users.has(username) || Array.from(users.values()).some(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user
    users.set(username, {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'User registered successfully',
      username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * User login endpoint
 */
app.post('/api/v1/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Token validation endpoint
 */
app.post('/api/v1/validate', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      valid: true,
      user: {
        username: decoded.username,
        email: decoded.email
      },
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user info endpoint (requires valid token)
 */
app.get('/api/v1/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = users.get(decoded.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Prometheus metrics endpoint
 */
app.get('/metrics', (req, res) => {
  const serviceName = 'auth-service';
  const totalUsers = users.size;
  const metrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="${serviceName}",method="total"} 0

# HELP service_users_total Total registered users
# TYPE service_users_total gauge
service_users_total{service="${serviceName}"} ${totalUsers}

# HELP service_up Service availability
# TYPE service_up gauge
service_up{service="${serviceName}"} 1
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(metrics);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service listening on port ${PORT}`);
  console.log(`JWT secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
});

