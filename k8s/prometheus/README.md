# Prometheus Configuration

Prometheus monitoring setup for the portfolio project.

## ServiceMonitor

The `service-monitor.yaml` configures Prometheus to scrape metrics from services labeled with `monitoring: enabled`.

## Adding Metrics to Services

To enable metrics scraping, add the label to your Service manifests:

```yaml
metadata:
  labels:
    monitoring: enabled
```

## Prometheus Installation

For production, you can install Prometheus using:

1. **Prometheus Operator** (Recommended):
```bash
kubectl create namespace monitoring
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
```

2. **Helm Chart**:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

## Accessing Prometheus

After installation, access Prometheus UI via port-forward:
```bash
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
```

Then visit http://localhost:9090

