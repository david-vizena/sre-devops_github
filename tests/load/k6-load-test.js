import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8082';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(1);

  // If we have an auth token, test authenticated endpoints
  if (AUTH_TOKEN) {
    const headers = {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Test aggregate endpoint
    const aggregateResponse = http.get(`${BASE_URL}/api/v1/aggregate`, {
      headers: headers,
    });
    check(aggregateResponse, {
      'aggregate status is 200': (r) => r.status === 200,
      'aggregate response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(1);

    // Test transaction processing
    const transactionPayload = JSON.stringify({
      customer_id: `test-${__VU}-${__ITER}`,
      items: [
        {
          id: '1',
          name: 'Test Product',
          price: 29.99,
          quantity: 1,
          category: 'electronics',
        },
      ],
    });

    const transactionResponse = http.post(
      `${BASE_URL}/api/v1/process-transaction`,
      transactionPayload,
      { headers: headers },
    );
    check(transactionResponse, {
      'transaction status is 200': (r) => r.status === 200,
      'transaction response time < 1000ms': (r) => r.timings.duration < 1000,
      'transaction has transaction_id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.transaction_id || body.transactionId !== undefined;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    sleep(2);
  }

  // Test rate limiting (unauthenticated endpoints)
  const rateLimitTest = http.get(`${BASE_URL}/api/v1/aggregate`);
  if (rateLimitTest.status === 429) {
    console.log('Rate limit working correctly');
  }
}

