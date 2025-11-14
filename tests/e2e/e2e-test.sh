#!/bin/bash
# End-to-End Testing Script
# Tests the entire application stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-default}"
DATA_NAMESPACE="${DATA_NAMESPACE:-data-services}"
MONITORING_NAMESPACE="${MONITORING_NAMESPACE:-monitoring}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}End-to-End Testing${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to test HTTP endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -e "${YELLOW}Testing: ${name}${NC}"
    echo "  URL: ${url}"
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}"); then
        if [ "${response}" -eq "${expected_code}" ]; then
            echo -e "  ${GREEN}✓ PASS${NC} (HTTP ${response})"
            return 0
        else
            echo -e "  ${RED}✗ FAIL${NC} (Expected ${expected_code}, got ${response})"
            return 1
        fi
    else
        echo -e "  ${RED}✗ FAIL${NC} (Connection error)"
        return 1
    fi
}

# Function to check Kubernetes resource
check_resource() {
    local resource_type=$1
    local resource_name=$2
    local namespace=$3
    
    if kubectl get "${resource_type}" "${resource_name}" -n "${namespace}" &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} ${resource_type}/${resource_name} exists"
        return 0
    else
        echo -e "  ${RED}✗${NC} ${resource_type}/${resource_name} not found"
        return 1
    fi
}

# Function to check pod status
check_pod_status() {
    local pod_prefix=$1
    local namespace=$2
    
    echo -e "${YELLOW}Checking pods with prefix: ${pod_prefix}${NC}"
    pods=$(kubectl get pods -n "${namespace}" --no-headers 2>/dev/null | grep "^${pod_prefix}" || true)
    
    if [ -z "${pods}" ]; then
        echo -e "  ${RED}✗${NC} No pods found with prefix ${pod_prefix}"
        return 1
    fi
    
    all_ready=true
    while IFS= read -r pod; do
        pod_name=$(echo "${pod}" | awk '{print $1}')
        status=$(echo "${pod}" | awk '{print $3}')
        ready=$(echo "${pod}" | awk '{print $2}')
        
        if [ "${status}" = "Running" ] && [[ "${ready}" == *"/"* ]]; then
            echo -e "  ${GREEN}✓${NC} ${pod_name}: ${status} (${ready})"
        else
            echo -e "  ${RED}✗${NC} ${pod_name}: ${status} (${ready})"
            all_ready=false
        fi
    done <<< "${pods}"
    
    if [ "${all_ready}" = true ]; then
        return 0
    else
        return 1
    fi
}

# Test 1: Check Kubernetes Deployments
echo -e "${GREEN}Test 1: Kubernetes Resources${NC}"
echo "=================================="

# Check application deployments
echo "Checking application deployments..."
check_resource "deployment" "react-frontend" "${NAMESPACE}" || true
check_resource "deployment" "js-gateway" "${NAMESPACE}" || true
check_resource "deployment" "go-service" "${NAMESPACE}" || true
check_resource "deployment" "python-service" "${NAMESPACE}" || true
check_resource "deployment" "csharp-risk-service" "${NAMESPACE}" || true
check_resource "deployment" "dotnet-service" "${NAMESPACE}" || true
check_resource "deployment" "auth-service" "${NAMESPACE}" || true

# Check monitoring deployments
echo ""
echo "Checking monitoring deployments..."
check_resource "deployment" "prometheus" "${MONITORING_NAMESPACE}" || true
check_resource "deployment" "grafana" "${MONITORING_NAMESPACE}" || true
check_resource "deployment" "jaeger" "${MONITORING_NAMESPACE}" || true

# Check Vault
echo ""
echo "Checking Vault..."
check_resource "statefulset" "vault" "${MONITORING_NAMESPACE}" || true

echo ""
echo ""

# Test 2: Check Pod Status
echo -e "${GREEN}Test 2: Pod Status${NC}"
echo "=================================="

echo "Checking application pods..."
check_pod_status "react-frontend" "${NAMESPACE}" || true
check_pod_status "js-gateway" "${NAMESPACE}" || true
check_pod_status "go-service" "${NAMESPACE}" || true
check_pod_status "python-service" "${NAMESPACE}" || true
check_pod_status "auth-service" "${NAMESPACE}" || true

echo ""
echo "Checking monitoring pods..."
check_pod_status "prometheus" "${MONITORING_NAMESPACE}" || true
check_pod_status "grafana" "${MONITORING_NAMESPACE}" || true
check_pod_status "jaeger" "${MONITORING_NAMESPACE}" || true
check_pod_status "vault" "${MONITORING_NAMESPACE}" || true

echo ""
echo ""

# Test 3: Get Ingress IP
echo -e "${GREEN}Test 3: Ingress Configuration${NC}"
echo "=================================="

INGRESS_IP=$(kubectl get ingress -A -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
if [ -z "${INGRESS_IP}" ]; then
    echo -e "${YELLOW}No external IP found for ingress. Trying to get service IP...${NC}"
    INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
fi

if [ -z "${INGRESS_IP}" ]; then
    echo -e "${RED}Could not determine ingress IP. You may need to set INGRESS_IP manually.${NC}"
    INGRESS_IP="YOUR_INGRESS_IP"
fi

echo "Using Ingress IP: ${INGRESS_IP}"
echo ""

# Test 4: Health Check Endpoints
echo -e "${GREEN}Test 4: Health Check Endpoints${NC}"
echo "=================================="

# Test services via port-forward if ingress not available
if [ "${INGRESS_IP}" = "YOUR_INGRESS_IP" ]; then
    echo -e "${YELLOW}Note: Using port-forward for testing. Set INGRESS_IP to test via ingress.${NC}"
    echo ""
    
    # Start port-forwards in background (would need to be done separately)
    echo "To test via port-forward, run:"
    echo "  kubectl port-forward svc/js-gateway 8082:8080 -n ${NAMESPACE} &"
    echo "  kubectl port-forward svc/react-frontend 3000:80 -n ${NAMESPACE} &"
    echo ""
else
    # Test via ingress
    test_endpoint "React Frontend" "http://${INGRESS_IP}" || true
    test_endpoint "JS Gateway Health" "http://${INGRESS_IP}/api/health" || true
    test_endpoint "Grafana" "http://${INGRESS_IP}/grafana" || true
    test_endpoint "Jaeger" "http://${INGRESS_IP}/jaeger" || true
fi

echo ""
echo ""

# Test 5: Service-to-Service Communication
echo -e "${GREEN}Test 5: Service-to-Service Communication${NC}"
echo "=================================="

# Test API Gateway → Go Service
echo "Testing API Gateway → Go Service..."
if kubectl exec -n "${NAMESPACE}" $(kubectl get pods -n "${NAMESPACE}" -l app=js-gateway -o jsonpath='{.items[0].metadata.name}') -- \
    curl -s -f http://go-service:8080/health &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} JS Gateway can reach Go Service"
else
    echo -e "  ${RED}✗${NC} JS Gateway cannot reach Go Service"
fi

# Test API Gateway → Python Service
echo "Testing API Gateway → Python Service..."
if kubectl exec -n "${NAMESPACE}" $(kubectl get pods -n "${NAMESPACE}" -l app=js-gateway -o jsonpath='{.items[0].metadata.name}') -- \
    curl -s -f http://python-service:8081/health &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} JS Gateway can reach Python Service"
else
    echo -e "  ${RED}✗${NC} JS Gateway cannot reach Python Service"
fi

echo ""
echo ""

# Test 6: Observability Stack
echo -e "${GREEN}Test 6: Observability Stack${NC}"
echo "=================================="

# Check Prometheus metrics endpoint
echo "Testing Prometheus..."
if kubectl exec -n "${MONITORING_NAMESPACE}" $(kubectl get pods -n "${MONITORING_NAMESPACE}" -l app=prometheus -o jsonpath='{.items[0].metadata.name}') -- \
    curl -s -f http://localhost:9090/-/healthy &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Prometheus is healthy"
else
    echo -e "  ${RED}✗${NC} Prometheus health check failed"
fi

# Check Grafana
echo "Testing Grafana..."
if kubectl exec -n "${MONITORING_NAMESPACE}" $(kubectl get pods -n "${MONITORING_NAMESPACE}" -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
    curl -s -f http://localhost:3000/api/health &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Grafana is healthy"
else
    echo -e "  ${RED}✗${NC} Grafana health check failed"
fi

# Check Jaeger
echo "Testing Jaeger..."
if kubectl exec -n "${MONITORING_NAMESPACE}" $(kubectl get pods -n "${MONITORING_NAMESPACE}" -l app=jaeger -o jsonpath='{.items[0].metadata.name}') -- \
    curl -s -f http://localhost:16686/ &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Jaeger is accessible"
else
    echo -e "  ${RED}✗${NC} Jaeger health check failed"
fi

echo ""
echo ""

# Test 7: Vault Integration
echo -e "${GREEN}Test 7: Vault Integration${NC}"
echo "=================================="

vault_pod=$(kubectl get pods -n "${MONITORING_NAMESPACE}" -l app=vault -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "${vault_pod}" ]; then
    vault_status=$(kubectl get pod "${vault_pod}" -n "${MONITORING_NAMESPACE}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")
    if [ "${vault_status}" = "Running" ]; then
        echo -e "  ${GREEN}✓${NC} Vault pod is running"
        
        # Check if Vault is initialized
        if kubectl exec -n "${MONITORING_NAMESPACE}" "${vault_pod}" -- \
            vault status &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Vault is initialized"
        else
            echo -e "  ${YELLOW}⚠${NC} Vault may not be initialized or sealed"
        fi
    else
        echo -e "  ${RED}✗${NC} Vault pod status: ${vault_status}"
    fi
else
    echo -e "  ${RED}✗${NC} Vault pod not found"
fi

echo ""
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}End-to-End Testing Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Note: Some tests may show warnings or failures if services are still"
echo "starting up or if ingress is not configured. Review individual results above."
echo ""

