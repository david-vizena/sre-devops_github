# React Frontend

Modern React frontend for the SRE/DevOps portfolio project.

## Features

- Interactive UI to test microservices
- Real-time health checks
- Service statistics display
- Aggregated service view
- Responsive design

## Configuration

Environment variables:
- `REACT_APP_API_URL` - API Gateway URL (default: http://localhost:8082)

## Running Locally

```bash
npm install
npm start
```

The app will open at http://localhost:3000

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Docker

```bash
docker build -t react-frontend:latest .
docker run -p 80:80 react-frontend:latest
```

The app will be served by NGINX at http://localhost

