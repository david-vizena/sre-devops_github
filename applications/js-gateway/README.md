# JavaScript API Gateway

API Gateway service that routes requests to backend microservices.

## Features

- Request routing to Go and Python microservices
- Request aggregation from multiple services
- CORS support for frontend integration
- Error handling and service resilience
- Health check endpoint

## Endpoints

- `GET /health` - Gateway health check
- `GET /api/v1/aggregate` - Aggregate responses from all services
- `GET|POST /api/v1/go/*` - Proxy to Go service
- `GET|POST /api/v1/python/*` - Proxy to Python service
- `POST /api/v1/process` - Direct call to Go service process endpoint
- `POST /api/v1/transform` - Direct call to Python service transform endpoint

## Configuration

Environment variables:
- `PORT` - Server port (default: 8082)
- `SERVICE_NAME` - Service identifier (default: js-gateway)
- `GO_SERVICE_URL` - Go microservice URL (default: http://localhost:8080)
- `PYTHON_SERVICE_URL` - Python microservice URL (default: http://localhost:8081)

## Running Locally

```bash
npm install
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Docker

```bash
docker build -t js-gateway:latest .
docker run -p 8082:8082 js-gateway:latest
```

