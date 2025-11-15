# Autoscaling Configuration

Horizontal Pod Autoscaler (HPA) and Vertical Pod Autoscaler (VPA) configurations.

## Horizontal Pod Autoscaler (HPA)

HPA automatically scales the number of pod replicas based on CPU and memory utilization.

### Configuration

- **Target CPU**: 70% utilization
- **Target Memory**: 80% utilization
- **Min Replicas**: 2 (ensures high availability)
- **Max Replicas**: Varies by service (6-10)

### Scaling Behavior

- **Scale Up**: 
  - Immediate (0s stabilization window)
  - Can add up to 100% more pods or 2 pods every 30 seconds
  - Whichever is greater
  
- **Scale Down**:
  - 5-minute stabilization window
  - Can remove up to 50% of pods every 60 seconds
  - Prevents aggressive downscaling

### Services with HPA

- `go-service`: 2-10 replicas
- `js-gateway`: 2-10 replicas
- `python-service`: 2-8 replicas
- `react-frontend`: 2-6 replicas
- `auth-service`: 2-6 replicas

## Vertical Pod Autoscaler (VPA)

VPA automatically adjusts CPU and memory requests/limits based on historical usage.

### Configuration

- **Update Mode**: Auto (automatically updates resource requests)
- **Min Resources**: CPU 50m, Memory 64Mi
- **Max Resources**: CPU 2, Memory 4Gi

### Services with VPA

- `go-service`
- `js-gateway`
- `python-service`

### Important Notes

⚠️ **HPA and VPA cannot be used together on the same deployment** for CPU/memory autoscaling. VPA should be used for resource optimization, HPA for replica scaling based on load.

For production, choose one:
- **HPA** (recommended): Scales replicas, better for handling traffic spikes
- **VPA**: Optimizes resource requests, better for cost optimization

## Installation

```bash
# Install HPA (already available in Kubernetes 1.23+)
kubectl apply -f k8s/autoscaling/hpa.yaml

# Install VPA (requires VPA controller)
# First, install VPA controller:
# kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-release-0.14.0/vpa-release.yaml
kubectl apply -f k8s/vpa/vpa.yaml
```

## Monitoring

Check HPA status:
```bash
kubectl get hpa
kubectl describe hpa go-service-hpa
```

Check VPA recommendations:
```bash
kubectl get vpa
kubectl describe vpa go-service-vpa
```

