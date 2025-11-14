/**
 * API Gateway - Routes requests to microservices
 * This is the entry point for all client requests
 */

// Initialize OpenTelemetry tracing first (before other imports)
require('./tracing');

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const cache = require('./lib/cache');
const messageBus = require('./lib/messageBus');
const database = require('./lib/database');
const { authenticateToken } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 8082;
const SERVICE_NAME = process.env.SERVICE_NAME || 'js-gateway';
const AGGREGATE_CACHE_TTL = parseInt(process.env.AGGREGATE_CACHE_TTL || '60', 10);
const TRANSACTION_CACHE_TTL = parseInt(process.env.TRANSACTION_CACHE_TTL || '120', 10);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return UUID_REGEX.test(value);
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchTransactionFromPostgres(id) {
  const mainResult = await database.query(
    `SELECT id,
            customer_id,
            subtotal,
            tax,
            discount,
            total,
            currency,
            created_at,
            processed_at
     FROM transactions
     WHERE id = $1`,
    [id],
  );

  if (mainResult.rowCount === 0) {
    return null;
  }

  const transaction = mainResult.rows[0];

  const itemsResult = await database.query(
    `SELECT product_id,
            name,
            category,
            unit_price,
            quantity
     FROM transaction_items
     WHERE transaction_id = $1`,
    [id],
  );

  const items = itemsResult.rows.map((item) => {
    const unitPrice = toNumber(item.unit_price) || 0;
    const quantity = Number(item.quantity) || 0;
    return {
      productId: item.product_id,
      name: item.name,
      category: item.category,
      unitPrice,
      quantity,
      lineTotal: parseFloat((unitPrice * quantity).toFixed(2)),
    };
  });

  return {
    source: 'postgresql',
    transactionId: transaction.id,
    customerId: transaction.customer_id,
    currency: transaction.currency,
    createdAt: toIso(transaction.created_at),
    processedAt: toIso(transaction.processed_at),
    totals: {
      subtotal: toNumber(transaction.subtotal),
      tax: toNumber(transaction.tax),
      discount: toNumber(transaction.discount),
      total: toNumber(transaction.total),
      items: items.reduce((acc, item) => acc + item.quantity, 0),
    },
    items,
  };
}

// Service URLs - In Kubernetes, these will be service names
const GO_SERVICE_URL = process.env.GO_SERVICE_URL || 'http://localhost:8080';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8081';
const CSHARP_RISK_SERVICE_URL = process.env.CSHARP_RISK_SERVICE_URL || 'http://localhost:8083';
const DOTNET_SERVICE_URL = process.env.DOTNET_SERVICE_URL || 'http://localhost:8084';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8085';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Prometheus metrics endpoint
 */
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

/**
 * Auth endpoints - proxy to auth-service (no auth required for register/login)
 * Note: Ingress strips /api prefix, so these are accessed at /v1/auth/* from ingress
 */
app.post('/v1/auth/register', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/v1/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Registration failed',
      message: error.response?.data?.error || error.message,
    });
  }
});

app.post('/v1/auth/login', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/v1/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Login failed',
      message: error.response?.data?.error || error.message,
    });
  }
});

app.post('/v1/auth/validate', authenticateToken, async (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.get('/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/me`, {
      headers: { Authorization: req.headers.authorization },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to get user info',
      message: error.response?.data?.error || error.message,
    });
  }
});

/**
 * Health check endpoint
 */
// Health check endpoint (works with and without /api prefix due to ingress)
app.get('/health', async (req, res) => {
  let databaseStatus = 'unknown';
  try {
    await database.query('SELECT 1');
    databaseStatus = 'up';
  } catch (error) {
    console.error('Postgres health check failed:', error.message);
    databaseStatus = 'down';
  }

  res.json({
    status: databaseStatus === 'up' ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    upstream_services: {
      go_service: GO_SERVICE_URL,
      python_service: PYTHON_SERVICE_URL,
      csharp_risk_service: CSHARP_RISK_SERVICE_URL,
      dotnet_service: DOTNET_SERVICE_URL,
      auth_service: AUTH_SERVICE_URL,
    },
  });
});

/**
 * Aggregate endpoint - demonstrates API gateway pattern
 * Calls multiple microservices and aggregates responses
 */
app.get('/api/v1/aggregate', authenticateToken, async (req, res) => {
  try {
    const cacheKey = 'aggregate:v1';
    const { data, cacheHit } = await cache.wrap(cacheKey, async () => {
      const [goResponse, pythonResponse, csharpRiskResponse, dotnetResponse] = await Promise.allSettled([
        axios.get(`${GO_SERVICE_URL}/api/v1/stats`),
        axios.get(`${PYTHON_SERVICE_URL}/api/v1/metrics`),
        axios.get(`${CSHARP_RISK_SERVICE_URL}/api/v1/stats`),
        axios.get(`${DOTNET_SERVICE_URL}/api/v1/stats`),
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
          : { error: 'Service unavailable' },
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
      message: error.message,
    });
  }
});

app.post('/api/v1/go/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/go', '');
    const response = await axios.post(`${GO_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Go service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Go service unavailable',
      message: error.message,
    });
  }
});

/**
 * Transaction lookup endpoint (PostgreSQL + Redis cache)
 */
app.get('/api/v1/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return res.status(400).json({ error: 'Invalid transaction ID format' });
  }

  const cacheKey = `transaction:${id}`;

  try {
    const { data, cacheHit } = await cache.wrap(cacheKey, async () => {
      const record = await fetchTransactionFromPostgres(id);
      return record;
    }, TRANSACTION_CACHE_TTL);

    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');

    if (!data) {
      return res.status(404).json({ error: 'Transaction not found', transactionId: id });
    }

    return res.json(data);
  } catch (error) {
    console.error('Transaction lookup error:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * Proxy to Python service
 */
app.get('/api/v1/python/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/python', '');
    const response = await axios.get(`${PYTHON_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('Python service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Python service unavailable',
      message: error.message,
    });
  }
});

app.post('/api/v1/python/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/python', '');
    const response = await axios.post(`${PYTHON_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Python service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Python service unavailable',
      message: error.message,
    });
  }
});

/**
 * Transaction processing endpoint - Go service
 */
app.post('/api/v1/process-transaction', authenticateToken, async (req, res) => {
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

    if (response.data?.transactionId) {
      cache.del(`transaction:${response.data.transactionId}`).catch((err) => {
        console.warn('Failed to invalidate transaction cache:', err.message);
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error('Transaction processing error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to process transaction',
      message: error.message, 
    });
  }
});

/**
 * Analytics endpoint - Python service
 */
app.get('/api/v1/analyze', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/v1/analyze`);
    res.json(response.data);
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to analyze transactions',
      message: error.message, 
    });
  }
});

app.post('/api/v1/analyze', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/v1/analyze`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to analyze transactions',
      message: error.message, 
    });
  }
});

/**
 * Generate report - Python service
 */
app.get('/api/v1/report', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/v1/report`);
    res.json(response.data);
  } catch (error) {
    console.error('Report generation error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to generate report',
      message: error.message, 
    });
  }
});

/**
 * Risk calculation endpoint - C# Risk service
 */
app.post('/api/v1/calculate-risk', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${CSHARP_RISK_SERVICE_URL}/api/v1/calculate`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Risk calculation error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to calculate risk',
      message: error.message, 
    });
  }
});

/**
 * Proxy to C# Risk service
 */
app.get('/api/v1/csharp-risk/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/csharp-risk', '');
    const response = await axios.get(`${CSHARP_RISK_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('C# Risk service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'C# Risk service unavailable',
      message: error.message,
    });
  }
});

app.post('/api/v1/csharp-risk/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/csharp-risk', '');
    const response = await axios.post(`${CSHARP_RISK_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('C# Risk service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'C# Risk service unavailable',
      message: error.message,
    });
  }
});

/**
 * Inventory check endpoint - .NET service
 */
app.post('/api/v1/inventory/check', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${DOTNET_SERVICE_URL}/api/v1/inventory/check`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Inventory check error:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to check inventory',
      message: error.message, 
    });
  }
});

/**
 * Proxy to .NET service
 */
app.get('/api/v1/dotnet/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/dotnet', '');
    const response = await axios.get(`${DOTNET_SERVICE_URL}${path}`);
    res.json(response.data);
  } catch (error) {
    console.error('.NET service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: '.NET service unavailable',
      message: error.message,
    });
  }
});

app.post('/api/v1/dotnet/*', authenticateToken, async (req, res) => {
  try {
    const path = req.path.replace('/api/v1/dotnet', '');
    const response = await axios.post(`${DOTNET_SERVICE_URL}${path}`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('.NET service proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: '.NET service unavailable',
      message: error.message,
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
app.use((err, req, res, _next) => {
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
  database.ensureConnection()
    .then(() => console.log('PostgreSQL connection ready'))
    .catch((err) => console.error('PostgreSQL connection failed:', err.message));
});

let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down gracefully...`);
  Promise.allSettled([
    cache.close(),
    messageBus.close(),
    database.closePool(),
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

