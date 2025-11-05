# Go Microservice

High-performance business logic microservice built with Go.

## Features

- RESTful API endpoints
- Health check endpoint for Kubernetes liveness/readiness probes
- Graceful shutdown handling
- Environment-based configuration
- Structured JSON responses

## Endpoints

- `GET /health` - Health check endpoint
- `POST /api/v1/process` - Process business logic
- `GET /api/v1/stats` - Service statistics

## Configuration

Environment variables:
- `PORT` - Server port (default: 8080)
- `SERVICE_NAME` - Service identifier (default: go-service)
- `ENVIRONMENT` - Deployment environment

## Building

```bash
go build -o go-service .
```

## Running Locally

```bash
PORT=8080 SERVICE_NAME=go-service ./go-service
```

## Docker

```bash
docker build -t go-service:latest .
docker run -p 8080:8080 go-service:latest
```

