# Grafana Configuration

Grafana dashboard configuration for monitoring portfolio services.

## Dashboard ConfigMap

The `dashboard-configmap.yaml` contains a sample Grafana dashboard configuration. Grafana can automatically discover and load dashboards from ConfigMaps labeled with `grafana_dashboard: "1"`.

## Grafana Installation

Install Grafana using Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana -n monitoring
```

## Accessing Grafana

1. Get the admin password:
```bash
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

2. Port-forward to access Grafana UI:
```bash
kubectl port-forward svc/grafana -n monitoring 3000:80
```

3. Access Grafana at http://localhost:3000
   - Username: admin
   - Password: (from step 1)

## Custom Dashboards

You can create custom dashboards in Grafana UI and export them as JSON. Place exported JSON in ConfigMaps with the `grafana_dashboard: "1"` label for automatic discovery.

