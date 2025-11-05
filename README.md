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
- **go-service**: Business logic microservice
- **python-service**: Data processing microservice

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

## Directory Structure

```
├── terraform/              # Infrastructure as Code
├── applications/           # Microservices source code
├── k8s/                   # Kubernetes manifests
├── monitoring/             # SLO definitions and dashboards
└── docs/                  # Documentation
```
