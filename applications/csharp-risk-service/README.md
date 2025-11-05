# C# Risk Calculation Service

High-performance risk calculation service built with ASP.NET Core 8.0.

## Features

- ASP.NET Core 8.0 Web API
- Risk calculation algorithm for transaction analysis
- JSON-based request/response handling
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
dotnet build
dotnet run
```

## Docker

```bash
docker build -t csharp-risk-service:latest .
docker run -p 8083:8083 csharp-risk-service:latest
```

