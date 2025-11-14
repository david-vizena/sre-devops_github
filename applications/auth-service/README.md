# Authentication Service

JWT-based authentication service for the portfolio project.

## Features

- User registration
- User login with JWT token generation
- Token validation
- User profile retrieval

## Endpoints

- `POST /api/v1/register` - Register a new user
- `POST /api/v1/login` - Login and get JWT token
- `POST /api/v1/validate` - Validate a JWT token
- `GET /api/v1/me` - Get current user info (requires token)
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Configuration

Environment variables:
- `PORT` - Server port (default: 8085)
- `JWT_SECRET` - Secret key for JWT signing (required in production)
- `JWT_EXPIRES_IN` - Token expiration time (default: 24h)

## Running Locally

```bash
npm install
npm start
```

## Docker

```bash
docker build -t auth-service:latest .
docker run -p 8085:8085 auth-service:latest
```

