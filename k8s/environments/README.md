# Multi-Environment Setup

This directory contains Kubernetes configurations for multiple environments: dev, staging, and prod.

## Structure

```
environments/
├── base/              # Base kustomization (common resources)
├── dev/               # Development environment
├── staging/           # Staging environment
└── prod/              # Production environment
```

## Environment Differences

### Development (dev)
- **Replicas:** 1 per service
- **Resource Requests:** 50m CPU, 128Mi memory
- **Resource Limits:** 200m CPU, 256Mi memory
- **Purpose:** Development and testing
- **Ingress:** `dev.20.241.246.50.nip.io`

### Staging (staging)
- **Replicas:** 2 per service
- **Resource Requests:** 100m CPU, 256Mi memory
- **Resource Limits:** 500m CPU, 512Mi memory
- **Purpose:** Pre-production testing
- **Ingress:** `staging.20.241.246.50.nip.io`

### Production (prod)
- **Replicas:** 2 per service
- **Resource Requests:** 100m CPU, 256Mi memory
- **Resource Limits:** 500m CPU, 512Mi memory
- **Purpose:** Production workload
- **Ingress:** Main IP or `prod.20.241.246.50.nip.io`

## Deployment

### Using Kustomize

```bash
# Deploy to dev
kubectl apply -k k8s/environments/dev/

# Deploy to staging
kubectl apply -k k8s/environments/staging/

# Deploy to prod
kubectl apply -k k8s/environments/prod/
```

### Using ArgoCD

Update `k8s/argocd/argocd-applications.yaml` to point to environment-specific paths:

```yaml
spec:
  source:
    repoURL: https://github.com/your-org/repo
    path: k8s/environments/prod
    targetRevision: main
```

## Accessing Services

- **Dev:** http://dev.20.241.246.50.nip.io
- **Staging:** http://staging.20.241.246.50.nip.io
- **Prod:** http://20.241.246.50 or http://prod.20.241.246.50.nip.io

## Notes

- Each environment is isolated in its own namespace
- Services share the same database (data-services namespace) but can be separated if needed
- Monitoring (Prometheus, Grafana) is shared across environments
- Secrets should be environment-specific (currently shared via data-services namespace)

## Migration Path

Current setup uses `default` namespace (production). To migrate:

1. Deploy to `prod` namespace using Kustomize
2. Verify services work correctly
3. Update ingress to point to prod namespace
4. Keep `default` namespace for backward compatibility or remove after migration

