# Python Microservice

Data processing and transformation microservice built with Python.

## Features

- RESTful API endpoints for data transformation
- Health check endpoint for Kubernetes probes
- Graceful shutdown handling
- Environment-based configuration
- JSON-based request/response handling

## Endpoints

- `GET /health` - Health check endpoint
- `GET|POST /api/v1/transform` - Transform and process data
- `GET /api/v1/metrics` - Service metrics

## Configuration

Environment variables:
- `PORT` - Server port (default: 8081)
- `SERVICE_NAME` - Service identifier (default: python-service)
- `ENVIRONMENT` - Deployment environment

## Running Locally

```bash
python main.py
```

Or with environment variables:
```bash
PORT=8081 SERVICE_NAME=python-service python main.py
```

## Docker

```bash
docker build -t python-service:latest .
docker run -p 8081:8081 python-service:latest
```

