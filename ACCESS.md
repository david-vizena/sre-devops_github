# Access URLs and Credentials

## Portfolio Application

### Main Application
- **URL**: http://20.241.246.50/
- **API Gateway**: http://20.241.246.50/api/
- **Health Check**: http://20.241.246.50/api/health

## Observability Tools

### ArgoCD (GitOps)
- **URL**: http://13.82.12.36 (or https://13.82.12.36)
- **Username**: `admin`
- **Password**: Get with: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`

### Prometheus (Metrics)
- **Status**: LoadBalancer IP pending (Azure provisioning)
- **Port-forward**: `kubectl port-forward svc/prometheus -n monitoring 9090:9090`
- **Local Access**: http://localhost:9090

### Grafana (Dashboards)
- **Status**: LoadBalancer IP pending (Azure provisioning)
- **Port-forward**: `kubectl port-forward svc/grafana -n monitoring 3000:3000`
- **Local Access**: http://localhost:3000
- **Default Login**: Get password with: `kubectl get secret grafana-admin -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d`

### Jaeger (Distributed Tracing)
- **Status**: LoadBalancer IP pending (Azure provisioning)
- **Port-forward**: `kubectl port-forward svc/jaeger-query -n monitoring 16686:16686`
- **Local Access**: http://localhost:16686

## Service Architecture

### Running Services (12 pods total)
- Go Service: 2 replicas
- Python Service: 2 replicas
- C# Risk Service: 2 replicas
- .NET Service: 2 replicas
- JavaScript Gateway: 2 replicas
- React Frontend: 2 replicas

### Infrastructure Services
- NGINX Ingress Controller: 1 replica
- Prometheus: 1 replica
- Grafana: 1 replica
- Jaeger: 1 replica
- ArgoCD: 7 pods (controller, server, repo-server, etc.)

## Quick Access Commands

```bash
# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward to services
kubectl port-forward svc/prometheus -n monitoring 9090:9090
kubectl port-forward svc/grafana -n monitoring 3000:3000
kubectl port-forward svc/jaeger-query -n monitoring 16686:16686

# Check LoadBalancer IPs
kubectl get svc -A | grep LoadBalancer

# Check all pods
kubectl get pods --all-namespaces
```

