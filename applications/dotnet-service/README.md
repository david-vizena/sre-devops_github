# .NET Microservice

Inventory management service built with ASP.NET Core.

## Features

- ASP.NET Core 8.0 Web API
- Inventory checking and stock management
- JSON-based request/response handling
- Health check endpoint

## Endpoints

- `GET /health` - Health check endpoint
- `POST /api/v1/inventory/check` - Check inventory availability for items
- `GET /api/v1/stats` - Service statistics

## Inventory Check

The service checks if requested items are available in stock.

Request format:
```json
{
  "items": [
    {"id": "1", "quantity": 2},
    {"id": "2", "quantity": 5}
  ]
}
```

## Building

```bash
dotnet build
dotnet run
```

## Docker

```bash
docker build -t dotnet-service:latest .
docker run -p 8084:8084 dotnet-service:latest
```

