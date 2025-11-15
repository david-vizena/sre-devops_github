# Resource Quotas and Limit Ranges

Resource quotas and limit ranges per environment to prevent resource exhaustion.

## Configuration

### Development (dev)
- **CPU Requests**: 2 cores
- **Memory Requests**: 4Gi
- **CPU Limits**: 4 cores
- **Memory Limits**: 8Gi
- **Default Container**: 50m CPU, 128Mi memory (requests)
- **Default Limits**: 200m CPU, 256Mi memory

### Staging (staging)
- **CPU Requests**: 4 cores
- **Memory Requests**: 8Gi
- **CPU Limits**: 8 cores
- **Memory Limits**: 16Gi
- **Default Container**: 100m CPU, 256Mi memory (requests)
- **Default Limits**: 500m CPU, 512Mi memory

### Production (prod)
- **CPU Requests**: 8 cores
- **Memory Requests**: 16Gi
- **CPU Limits**: 16 cores
- **Memory Limits**: 32Gi
- **Default Container**: 100m CPU, 256Mi memory (requests)
- **Default Limits**: 500m CPU, 512Mi memory

## Usage

Quotas are automatically applied when deploying to each environment:

```bash
# Dev
kubectl apply -f k8s/environments/dev/resource-quota.yaml

# Staging
kubectl apply -f k8s/environments/staging/resource-quota.yaml

# Prod
kubectl apply -f k8s/environments/prod/resource-quota.yaml
```

## Checking Quotas

```bash
# View quotas
kubectl get resourcequota -n dev
kubectl get resourcequota -n staging
kubectl get resourcequota -n prod

# View limit ranges
kubectl get limitrange -n dev
kubectl get limitrange -n staging
kubectl get limitrange -n prod

# Detailed view
kubectl describe resourcequota dev-resource-quota -n dev
```

## Benefits

- **Prevents resource exhaustion**: One environment cannot consume all cluster resources
- **Cost control**: Limits resource usage per environment
- **Enforces best practices**: Default limits applied automatically
- **Multi-tenant safety**: Isolates resources between environments

