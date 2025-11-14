/**
 * Authentication Service with PostgreSQL
 * Handles user registration, login, and JWT token generation/validation
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const database = require('./lib/database');

const app = express();
const PORT = process.env.PORT || 8085;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await database.query('SELECT 1');
    dbStatus = 'up';
  } catch (error) {
    dbStatus = 'down';
  }

  res.json({
    status: dbStatus === 'up' ? 'healthy' : 'degraded',
    service: 'auth-service',
    database: dbStatus,
    timestamp: new Date().toISOString(),
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
    const existingUser = await database.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in database
    const result = await database.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword],
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
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

    // Find user in database
    const result = await database.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1',
      [username],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.json({
      message: 'Login successful',
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
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

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      },
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
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
app.get('/api/v1/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database to ensure they still exist
    const result = await database.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [decoded.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
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
app.get('/metrics', async (req, res) => {
  const serviceName = 'auth-service';
  let totalUsers = 0;
  try {
    const result = await database.query('SELECT COUNT(*) as count FROM users');
    totalUsers = parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Failed to get user count:', error);
  }

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

// Initialize database schema and start server
database
  .ensureConnection()
  .then(() => {
    return database.initSchema();
  })
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Auth service listening on port ${PORT}`);
      console.log(`JWT secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
      console.log('PostgreSQL database connected');
    });
  })
  .catch((error) => {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await database.closePool();
  process.exit(0);
});

