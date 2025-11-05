# Deployment Guide

Complete guide for deploying the SRE/DevOps portfolio project to Azure.

## Prerequisites

- Azure CLI installed and configured
- Terraform >= 1.0
- kubectl installed
- Docker installed
- Git access to this repository

## Step 1: Azure Setup

### Create Service Principal for AKS

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --name "sre-devops-portfolio" --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Save the output - you'll need clientId and clientSecret
```

### Create Resource Group (Optional - Terraform will create it)

```bash
az group create --name rg-sre-devops-portfolio --location eastus
```

## Step 2: Terraform Deployment

### Initialize Terraform

```bash
cd terraform
terraform init
```

### Create terraform.tfvars

Create a `terraform.tfvars` file with your values:

```hcl
resource_group_name = "rg-sre-devops-portfolio"
location            = "eastus"
acr_name            = "acrsredevops"  # Must be globally unique
cluster_name        = "aks-sre-devops"
service_principal_client_id     = "YOUR_CLIENT_ID"
service_principal_client_secret = "YOUR_CLIENT_SECRET"
dns_zone_name       = "yourdomain.com"  # Optional
```

### Deploy Infrastructure

```bash
terraform plan
terraform apply
```

This will create:
- Resource Group
- Azure Container Registry (ACR)
- Virtual Network and Subnets
- AKS Cluster
- DNS Zone (if configured)

### Save Outputs

After deployment, note the outputs:
- ACR login server
- AKS cluster name
- Kubernetes config location

## Step 3: Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials --resource-group rg-sre-devops-portfolio \
  --name aks-sre-devops

# Verify connection
kubectl get nodes
```

## Step 4: Build and Push Docker Images

### Login to ACR

```bash
az acr login --name acrsredevops
```

### Build and Push Images

```bash
# Go Service
cd ../applications/go-service
docker build -t acrsredevops.azurecr.io/go-service:latest .
docker push acrsredevops.azurecr.io/go-service:latest

# Python Service
cd ../python-service
docker build -t acrsredevops.azurecr.io/python-service:latest .
docker push acrsredevops.azurecr.io/python-service:latest

# JavaScript Gateway
cd ../js-gateway
docker build -t acrsredevops.azurecr.io/js-gateway:latest .
docker push acrsredevops.azurecr.io/js-gateway:latest

# React Frontend
cd ../react-frontend
docker build -t acrsredevops.azurecr.io/react-frontend:latest .
docker push acrsredevops.azurecr.io/react-frontend:latest
```

## Step 5: Deploy to Kubernetes

### Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### Deploy Applications

```bash
# Deploy all services
kubectl apply -f k8s/applications/go-service/
kubectl apply -f k8s/applications/python-service/
kubectl apply -f k8s/applications/js-gateway/
kubectl apply -f k8s/applications/react-frontend/

# Deploy Ingress (update domain in ingress.yaml first)
kubectl apply -f k8s/ingress/
```

### Verify Deployment

```bash
kubectl get pods
kubectl get services
kubectl get ingress
```

## Step 6: Set up ArgoCD (GitOps)

### Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Get Admin Password

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

### Access ArgoCD UI

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Visit https://localhost:8080 (accept self-signed certificate)
- Username: `admin`
- Password: (from above)

### Apply ArgoCD Applications

```bash
kubectl apply -f k8s/argocd/argocd-applications.yaml
```

ArgoCD will now automatically sync changes from Git.

## Step 7: Set up Observability (Optional)

### Prometheus

```bash
kubectl create namespace monitoring
# Install using Helm or Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

### Grafana

```bash
# Grafana is included with kube-prometheus-stack
# Get password
kubectl get secret --namespace monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward
kubectl port-forward svc/prometheus-grafana -n monitoring 3000:80
```

Visit http://localhost:3000
- Username: `admin`
- Password: (from above)

### Jaeger

```bash
# Install Jaeger Operator
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.49.0/jaeger-operator.yaml -n monitoring

# Deploy Jaeger instance
kubectl apply -f k8s/jaeger/jaeger-config.yaml
```

## Step 8: Configure DNS (Optional)

If you set up DNS in Terraform:

1. Get the Ingress IP:
```bash
kubectl get ingress
```

2. Create A record in Azure DNS pointing to the Ingress IP

3. Update the Ingress manifest with your domain

## Troubleshooting

### Check Pod Status
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Check Service Connectivity
```bash
kubectl exec -it <pod-name> -- curl http://service-name:port
```

### Check ACR Access
```bash
az aks check-acr --name aks-sre-devops \
  --resource-group rg-sre-devops-portfolio \
  --acr acrsredevops
```

## Next Steps

- Set up CI/CD pipeline (GitHub Actions, Azure DevOps)
- Configure monitoring alerts
- Set up SSL/TLS certificates
- Configure backup and disaster recovery
- Implement service mesh (Istio, Linkerd)

