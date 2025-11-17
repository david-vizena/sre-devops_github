# Loki - Log Aggregation

Loki is a horizontally-scalable, highly-available log aggregation system inspired by Prometheus.

## Architecture

- **Loki**: Log aggregation server that stores logs
- **Promtail**: Agent that ships logs from Kubernetes pods to Loki

## Files

- `loki.yaml`: Loki deployment, service, and configuration
- `promtail.yaml`: Promtail DaemonSet that collects logs from all nodes

## Configuration

Loki is configured to:
- Store logs in memory (for demo purposes)
- Expose HTTP API on port 3100
- Integrate with Grafana for log visualization

## Usage

1. **Deploy Loki and Promtail**:
   ```bash
   kubectl apply -f k8s/loki/
   ```

2. **Verify Loki is running**:
   ```bash
   kubectl get pods -n monitoring | grep loki
   kubectl get pods -n monitoring | grep promtail
   ```

3. **Access logs via Grafana**:
   - Open Grafana UI
   - Add Loki as a datasource (http://loki.monitoring.svc.cluster.local:3100)
   - Create log queries using LogQL

## LogQL Examples

```logql
# All logs from js-gateway
{app="js-gateway"}

# Error logs
{app="js-gateway"} |= "error"

# Logs with specific label
{namespace="default", pod=~"go-service.*"}
```

## Production Considerations

For production, consider:
- Persistent storage for Loki (currently in-memory)
- Retention policies
- Resource limits and requests
- High availability setup

