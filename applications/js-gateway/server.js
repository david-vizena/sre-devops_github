/**
 * API Gateway - Routes requests to microservices
 * This is the entry point for all client requests
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const cache = require('./lib/cache');
const messageBus = require('./lib/messageBus');

const app = express();
const PORT = process.env.PORT || 8082;
const SERVICE_NAME = process.env.SERVICE_NAME || 'js-gateway';
const AGGREGATE_CACHE_TTL = parseInt(process.env.AGGREGATE_CACHE_TTL || '60', 10);

// Service URLs - In Kubernetes, these will be service names
const GO_SERVICE_URL = process.env.GO_SERVICE_URL || 'http://localhost:8080';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8081';
const CSHARP_RISK_SERVICE_URL = process.env.CSHARP_RISK_SERVICE_URL || 'http://localhost:8083';
const DOTNET_SERVICE_URL = process.env.DOTNET_SERVICE_URL || 'http://localhost:8084';

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
// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  const metrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{service="js-gateway",method="total"} 0

# HELP http_request_duration_seconds Request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds{service="js-gateway",quantile="0.5"} 0.05
http_request_duration_seconds{service="js-gateway",quantile="0.95"} 0.1
http_request_duration_seconds{service="js-gateway",quantile="0.99"} 0.2

# HELP service_up Service availability
# TYPE service_up gauge
service_up{service="js-gateway"} 1
`;
  res.send(metrics);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    upstream_services: {
      go_service: GO_SERVICE_URL,
      python_service: PYTHON_SERVICE_URL,
      csharp_risk_service: CSHARP_RISK_SERVICE_URL,
      dotnet_service: DOTNET_SERVICE_URL
    }
  });
});

/**
 * Aggregate endpoint - demonstrates API gateway pattern
 * Calls multiple microservices and aggregates responses
 */
app.get('/api/v1/aggregate', async (req, res) => {
  try {
    const cacheKey = 'aggregate:v1';
    const { data, cacheHit } = await cache.wrap(cacheKey, async () => {
      const [goResponse, pythonResponse, csharpRiskResponse, dotnetResponse] = await Promise.allSettled([
        axios.get(`${GO_SERVICE_URL}/api/v1/stats`),
        axios.get(`${PYTHON_SERVICE_URL}/api/v1/metrics`),
        axios.get(`${CSHARP_RISK_SERVICE_URL}/api/v1/stats`),
        axios.get(`${DOTNET_SERVICE_URL}/api/v1/stats`)
      ]);

      return {
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
        go_service: goResponse.status === 'fulfilled'
          ? goResponse.value.data
          : { error: 'Service unavailable' },
        python_service: pythonResponse.status === 'fulfilled'
          ? pythonResponse.value.data
          : { error: 'Service unavailable' },
        csharp_risk_service: csharpRiskResponse.status === 'fulfilled'
          ? csharpRiskResponse.value.data
          : { error: 'Service unavailable' },
        dotnet_service: dotnetResponse.status === 'fulfilled'
          ? dotnetResponse.value.data
          : { error: 'Service unavailable' }
      };
    }, AGGREGATE_CACHE_TTL);

    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.json(data);
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
 * Transaction processing endpoint - Go service
 */
app.post('/api/v1/process-transaction', async (req, res) => {
  try {
    const response = await axios.post(`${GO_SERVICE_URL}/api/v1/process-transaction`, req.body);

    // Optionally send transaction to analytics service
    try {
      await axios.post(`${PYTHON_SERVICE_URL}/api/v1/store-transaction`, response.data);
    } catch (analyticsError) {
      console.error('Failed to store transaction for analytics:', analyticsError.message);
      // Don't fail the transaction if analytics fails
    }

    // Publish event for asynchronous processing
    try {
      await messageBus.publish('transaction.processed', {
        transactionId: response.data?.transactionId || response.data?.transaction_id,
        amount: response.data?.total || 0,
        currency: response.data?.currency || 'USD',
        raw: response.data,
      });
    } catch (publishError) {
      console.error('Failed to publish transaction event:', publishError.message);
    }

    res.json(response.data);
  } catch (error) {
    console.error('Transaction processing error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to process transaction',
      message: error.message 
    });
  }
});

/**
 * Analytics endpoint - Python service
 */
app.get('/api/v1/analyze', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/v1/analyze`);
    res.json(response.data);
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to analyze transactions',
      message: error.message 
    });
  }
});

app.post('/api/v1/analyze', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/v1/analyze`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to analyze transactions',
      message: error.message 
    });
  }
});

/**
 * Generate report - Python service
 */
app.get('/api/v1/report', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/v1/report`);
    res.json(response.data);
  } catch (error) {
    console.error('Report generation error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to generate report',
      message: error.message 
    });
  }
});

/**
 * Risk calculation endpoint - C# Risk service
 */
app.post('/api/v1/calculate-risk', async (req, res) => {
  try {
    const response = await axios.post(`${CSHARP_RISK_SERVICE_URL}/api/v1/calculate`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Risk calculation error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to calculate risk',
      message: error.message 
    });
  }
});

/**
 * Proxy to C# Risk service
 */
app.get('/api/v1/csharp-risk/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/csharp-risk', '');
    const response = await axios.get(`${CSHARP_RISK_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('C# Risk service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'C# Risk service unavailable',
      message: error.message
    });
  }
});

app.post('/api/v1/csharp-risk/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/csharp-risk', '');
    const response = await axios.post(`${CSHARP_RISK_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('C# Risk service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'C# Risk service unavailable',
      message: error.message
    });
  }
});

/**
 * Inventory check endpoint - .NET service
 */
app.post('/api/v1/inventory/check', async (req, res) => {
  try {
    const response = await axios.post(`${DOTNET_SERVICE_URL}/api/v1/inventory/check`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Inventory check error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to check inventory',
      message: error.message 
    });
  }
});

/**
 * Proxy to .NET service
 */
app.get('/api/v1/dotnet/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/dotnet', '');
    const response = await axios.get(`${DOTNET_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('.NET service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: '.NET service unavailable',
      message: error.message
    });
  }
});

app.post('/api/v1/dotnet/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/dotnet', '');
    const response = await axios.post(`${DOTNET_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('.NET service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: '.NET service unavailable',
      message: error.message
    });
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
  console.log(`C# Risk service URL: ${CSHARP_RISK_SERVICE_URL}`);
  console.log(`.NET service URL: ${DOTNET_SERVICE_URL}`);

  // Warm up Redis/RabbitMQ connections (non-blocking)
  cache.ensureConnected().catch((err) => console.error('Redis connection failed:', err.message));
  messageBus.ensureChannel().catch((err) => console.error('RabbitMQ connection failed:', err.message));
});

let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down gracefully...`);
  Promise.allSettled([
    cache.close(),
    messageBus.close(),
  ])
    .catch((err) => console.error('Error during shutdown:', err))
    .finally(() => {
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

