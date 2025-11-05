# ArgoCD GitOps Configuration

ArgoCD applications for automated deployment of the portfolio project.

## Applications

### portfolio-applications
Monitors the `k8s/applications` directory and automatically deploys all microservices:
- Go Service (Transaction Processing)
- Python Service (Analytics)
- C# Risk Service
- .NET Service (Inventory Management)
- JavaScript Gateway
- React Frontend

### portfolio-ingress
Monitors the `k8s/ingress` directory and manages the Ingress configuration for public access.

## Setup Instructions

1. Install ArgoCD in your Kubernetes cluster:
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

2. Get the ArgoCD admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

3. Port-forward to access ArgoCD UI:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

4. Access ArgoCD UI at https://localhost:8080
   - Username: admin
   - Password: (from step 2)

5. Apply the ArgoCD Application manifests:
```bash
kubectl apply -f k8s/argocd/argocd-applications.yaml
```

## GitOps Workflow

Once configured, ArgoCD will:
- Monitor the GitHub repository
- Automatically sync changes when code is pushed to `main` branch
- Self-heal if deployments drift from Git state
- Prune resources that are removed from Git

