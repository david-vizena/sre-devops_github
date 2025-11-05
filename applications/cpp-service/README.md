# C++ Microservice

High-performance risk calculation service built with C++.

## Features

- Native C++ performance for computationally intensive tasks
- Risk calculation algorithm for transaction analysis
- HTTP server implementation
- Health check endpoint

## Endpoints

- `GET /health` - Health check endpoint
- `POST /api/v1/calculate` - Calculate risk score for transactions
- `GET /api/v1/stats` - Service statistics

## Risk Calculation

The service calculates risk scores based on:
- Transaction amount (logarithmic scale)
- Customer credit score
- Transaction frequency

Returns risk level (low/medium/high) and recommendation.

## Building

```bash
g++ -std=c++17 -O3 -o cpp-service main.cpp
```

## Running Locally

```bash
PORT=8083 ./cpp-service
```

## Docker

```bash
docker build -t cpp-service:latest .
docker run -p 8083:8083 cpp-service:latest
```

