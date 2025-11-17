# SRE/DevOps Portfolio Project

A comprehensive cloud-native microservices application demonstrating modern SRE and DevOps practices.

## Architecture

This project implements a full-stack application with:
- **React Frontend**: Modern user interface
- **JavaScript API Gateway**: Node.js/Express backend service
- **Go Microservice**: High-performance business logic service
- **Python Microservice**: Data processing service
- **Kubernetes**: Container orchestration on Azure (AKS)
- **ArgoCD**: GitOps continuous deployment
- **Prometheus & Grafana**: Metrics collection and visualization
- **Jaeger**: Distributed tracing
- **Terraform**: Infrastructure as Code

## Infrastructure

- **Cloud Provider**: Microsoft Azure
- **Container Registry**: Azure Container Registry (ACR)
- **Kubernetes**: Azure Kubernetes Service (AKS)
- **DNS**: Azure DNS (configured via Terraform)

## Services

### Frontend
- React application served via NGINX in Docker container
- Publicly accessible via Kubernetes Ingress

### Backend Services
- **js-gateway**: API gateway handling routing and aggregation
- **go-service**: Transaction processing microservice
- **python-service**: Analytics and data processing microservice
- **csharp-risk-service**: Risk calculation microservice
- **dotnet-service**: Inventory management microservice

### Observability
- **Prometheus**: Metrics collection and storage
- **Grafana**: Dashboards and SLO monitoring
- **Jaeger**: Distributed tracing UI

## SLO/SLA Definitions

- **Availability SLO**: 99.9% uptime
- **Latency SLO**: 95% of requests < 500ms
- **Error Rate SLO**: < 0.1% error rate
- **Throughput SLO**: 1000 requests/second

## Deployment

Deployment is managed via GitOps using ArgoCD. All infrastructure is provisioned using Terraform.

### Quick Start

1. **Provision Infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Build and Push Docker Images**:
   ```bash
   # Login to ACR
   az acr login --name acrsredevops
   
   # Build and push each service
   docker build --platform linux/amd64 -t acrsredevops.azurecr.io/go-service:latest applications/go-service/
   docker push acrsredevops.azurecr.io/go-service:latest
   # Repeat for python-service, csharp-risk-service, dotnet-service, js-gateway, react-frontend
   ```

3. **Deploy to Kubernetes**:
   ```bash
   kubectl apply -f k8s/applications/
   kubectl apply -f k8s/ingress/
   ```

4. **Set up ArgoCD** (for GitOps):
   ```bash
   kubectl apply -f k8s/argocd/argocd-applications.yaml
   ```

## Technology Stack

### Applications
- **React 18** - Modern frontend with Tailwind CSS
- **Node.js/Express** - API Gateway with rate limiting and circuit breakers
- **Go 1.22** - Transaction processing microservice with OpenTelemetry
- **Python 3.11** - Analytics and data processing microservice
- **C# / .NET 8.0** - Risk calculation and inventory management services
- **Auth Service (Node.js)** - JWT-based authentication service

### Infrastructure & DevOps
- **Terraform** - Infrastructure as Code
- **Azure AKS** - Kubernetes orchestration
- **Azure Container Registry** - Docker image storage
- **ArgoCD** - GitOps continuous deployment
- **NGINX Ingress** - Load balancing and routing

### Observability
- **Prometheus** - Metrics collection with alert rules
- **Grafana** - Dashboards, SLO monitoring, and visualization
- **Jaeger** - Distributed tracing with OpenTelemetry
- **Loki** - Log aggregation system
- **Promtail** - Log shipper agent
- **OpenTelemetry** - Vendor-neutral observability instrumentation

## Directory Structure

```
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Main Terraform configuration
│   ├── variables.tf       # Variable definitions
│   ├── outputs.tf         # Output values
│   └── modules/           # Reusable Terraform modules
│       ├── aks/           # AKS cluster module
│       ├── container-registry/  # ACR module
│       ├── networking/    # VNet and subnets module
│       └── dns/           # DNS zone module
├── applications/          # Microservices source code
│   ├── go-service/        # Go transaction processing service
│   ├── python-service/    # Python analytics service
│   ├── csharp-risk-service/  # C# risk calculation service
│   ├── dotnet-service/    # .NET inventory management service
│   ├── js-gateway/        # Express API Gateway
│   ├── auth-service/      # JWT authentication service
│   └── react-frontend/    # React application
├── tests/                 # Testing infrastructure
│   ├── e2e/               # End-to-end test scripts
│   └── load/               # Load testing with k6
├── backup/                # Backup scripts and CronJobs
├── cost-monitoring/       # Azure cost monitoring scripts
└── linting/               # Linting configurations
├── k8s/                   # Kubernetes manifests
│   ├── applications/      # Service deployments and services
│   ├── ingress/           # Application ingress configurations
│   ├── argocd/            # ArgoCD applications
│   ├── prometheus/        # Prometheus (deployment, service, alert rules, ingress)
│   ├── grafana/           # Grafana (deployment, service, dashboards, ingress)
│   ├── jaeger/            # Jaeger (deployment, service, config, ingress)
│   ├── vault/             # Vault (policies, RBAC, scripts)
│   ├── loki/              # Loki log aggregation
│   ├── autoscaling/       # HPA and VPA configurations
│   ├── pdb/               # Pod Disruption Budgets
│   ├── cert-manager/      # TLS certificate management
│   ├── network-policies/  # Network security policies
│   └── environments/      # Multi-environment configs (dev/staging/prod)
└── docs/                # Documentation
```

## Features

- ✅ Multi-language microservices architecture
- ✅ Containerized applications with Docker
- ✅ Kubernetes orchestration
- ✅ GitOps with ArgoCD
- ✅ Infrastructure as Code with Terraform
- ✅ Observability stack (Prometheus, Grafana, Jaeger)
- ✅ Health checks and resource limits
- ✅ Modern UI with Tailwind CSS
- ✅ API Gateway pattern
- ✅ Service discovery and load balancing
