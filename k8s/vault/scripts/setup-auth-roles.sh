#!/bin/bash
# Script to create Kubernetes auth roles in Vault
# This script creates auth roles for all services

set -e

VAULT_POD="vault-vault-0"
VAULT_NAMESPACE="data-services"
VAULT_TOKEN="${VAULT_TOKEN:-}"

if [ -z "$VAULT_TOKEN" ]; then
    echo "Error: VAULT_TOKEN environment variable is not set"
    echo "Please set it to your Vault root token"
    exit 1
fi

echo "=========================================="
echo "Creating Kubernetes Auth Roles"
echo "=========================================="
echo ""

# Create js-gateway role
echo "Creating js-gateway role..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault write auth/kubernetes/role/js-gateway \
    bound_service_account_names=js-gateway \
    bound_service_account_namespaces=default \
    policies=js-gateway-policy \
    ttl=1h

# Create go-service role
echo "Creating go-service role..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault write auth/kubernetes/role/go-service \
    bound_service_account_names=go-service \
    bound_service_account_namespaces=default \
    policies=go-service-policy \
    ttl=1h

# Create python-service role
echo "Creating python-service role..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault write auth/kubernetes/role/python-service \
    bound_service_account_names=python-service-worker \
    bound_service_account_namespaces=default \
    policies=python-service-policy \
    ttl=1h

echo ""
echo "=========================================="
echo "Kubernetes auth roles created successfully!"
echo "=========================================="

