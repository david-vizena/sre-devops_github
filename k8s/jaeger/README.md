# Jaeger Distributed Tracing

Jaeger configuration for distributed tracing across microservices.

## Jaeger Installation

Install Jaeger Operator and instance:

1. Install Jaeger Operator:
```bash
kubectl create namespace monitoring
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.49.0/jaeger-operator.yaml -n monitoring
```

2. Apply the Jaeger instance:
```bash
kubectl apply -f k8s/jaeger/jaeger-config.yaml
```

## Accessing Jaeger UI

After installation, access Jaeger UI via port-forward:
```bash
kubectl port-forward svc/jaeger-query -n monitoring 16686:16686
```

Then visit http://localhost:16686

## Instrumenting Services

To enable tracing, services need to be instrumented with OpenTelemetry or Jaeger clients:

- **Go**: Use `github.com/jaegertracing/jaeger-client-go`
- **Python**: Use `opentelemetry-api` and `opentelemetry-sdk`
- **JavaScript**: Use `jaeger-client` or OpenTelemetry JS

## Production Considerations

For production, consider:
- Using Elasticsearch or Cassandra for persistent storage
- Deploying with `production` strategy (separate components)
- Configuring sampling rates to manage volume

