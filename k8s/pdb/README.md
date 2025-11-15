# Pod Disruption Budgets (PDB)

Pod Disruption Budgets ensure high availability during voluntary disruptions (node updates, cluster maintenance).

## Configuration

All application services have PDBs configured with `minAvailable: 1`, ensuring at least one pod remains available during:
- Rolling updates
- Node drains
- Cluster maintenance
- Pod evictions

## Services with PDB

- `go-service`
- `js-gateway`
- `python-service`
- `react-frontend`
- `auth-service`
- `csharp-risk-service`
- `dotnet-service`

## Usage

```bash
# Apply PDBs
kubectl apply -f k8s/pdb/pod-disruption-budgets.yaml

# Check PDB status
kubectl get pdb
kubectl describe pdb go-service-pdb
```

## How It Works

When a disruption is requested (e.g., node drain), Kubernetes:
1. Checks PDB constraints
2. Ensures `minAvailable` pods remain running
3. Only evicts pods if PDB constraints are met
4. Prevents complete service unavailability

This is especially important for:
- Production environments
- Zero-downtime deployments
- Cluster maintenance windows

