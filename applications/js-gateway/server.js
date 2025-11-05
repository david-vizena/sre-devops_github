/**
 * API Gateway - Routes requests to microservices
 * This is the entry point for all client requests
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8082;
const SERVICE_NAME = process.env.SERVICE_NAME || 'js-gateway';

// Service URLs - In Kubernetes, these will be service names
const GO_SERVICE_URL = process.env.GO_SERVICE_URL || 'http://localhost:8080';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8081';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    upstream_services: {
      go_service: GO_SERVICE_URL,
      python_service: PYTHON_SERVICE_URL
    }
  });
});

/**
 * Aggregate endpoint - demonstrates API gateway pattern
 * Calls multiple microservices and aggregates responses
 */
app.get('/api/v1/aggregate', async (req, res) => {
  try {
    // Make parallel requests to both services
    const [goResponse, pythonResponse] = await Promise.allSettled([
      axios.get(`${GO_SERVICE_URL}/api/v1/stats`),
      axios.get(`${PYTHON_SERVICE_URL}/api/v1/metrics`)
    ]);

    const aggregated = {
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      go_service: goResponse.status === 'fulfilled' 
        ? goResponse.value.data 
        : { error: 'Service unavailable' },
      python_service: pythonResponse.status === 'fulfilled'
        ? pythonResponse.value.data
        : { error: 'Service unavailable' }
    };

    res.json(aggregated);
  } catch (error) {
    console.error('Aggregation error:', error);
    res.status(500).json({ error: 'Failed to aggregate services' });
  }
});

/**
 * Proxy to Go service
 */
app.get('/api/v1/go/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/go', '');
    const response = await axios.get(`${GO_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('Go service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Go service unavailable',
      message: error.message
    });
  }
});

app.post('/api/v1/go/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/go', '');
    const response = await axios.post(`${GO_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Go service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Go service unavailable',
      message: error.message
    });
  }
});

/**
 * Proxy to Python service
 */
app.get('/api/v1/python/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/python', '');
    const response = await axios.get(`${PYTHON_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('Python service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Python service unavailable',
      message: error.message
    });
  }
});

app.post('/api/v1/python/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/python', '');
    const response = await axios.post(`${PYTHON_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Python service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Python service unavailable',
      message: error.message
    });
  }
});

/**
 * Direct endpoints that call microservices
 */
app.get('/api/v1/process', async (req, res) => {
  try {
    const response = await axios.post(`${GO_SERVICE_URL}/api/v1/process`);
    res.json(response.data);
  } catch (error) {
    console.error('Process endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/v1/transform', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/v1/transform`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Transform endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to transform data' });
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

/**
 * Graceful shutdown
 */
const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on port ${PORT}`);
  console.log(`Go service URL: ${GO_SERVICE_URL}`);
  console.log(`Python service URL: ${PYTHON_SERVICE_URL}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

