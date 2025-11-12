#!/bin/bash
# Script to create Vault policies
# This script creates all Vault policies for the services

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
echo "Creating Vault Policies"
echo "=========================================="
echo ""

# Create js-gateway policy
echo "Creating js-gateway policy..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault policy write js-gateway-policy - <<EOF
# Policy for js-gateway service
path "secret/data/js-gateway/*" {
  capabilities = ["read"]
}

path "secret/data/shared/redis" {
  capabilities = ["read"]
}

path "secret/data/shared/rabbitmq" {
  capabilities = ["read"]
}

path "secret/data/shared/postgresql" {
  capabilities = ["read"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}
EOF

# Create go-service policy
echo "Creating go-service policy..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault policy write go-service-policy - <<EOF
# Policy for go-service
path "secret/data/go-service/*" {
  capabilities = ["read"]
}

path "secret/data/shared/postgresql" {
  capabilities = ["read"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}
EOF

# Create python-service policy
echo "Creating python-service policy..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault policy write python-service-policy - <<EOF
# Policy for python-service-worker
path "secret/data/python-service/*" {
  capabilities = ["read"]
}

path "secret/data/shared/rabbitmq" {
  capabilities = ["read"]
}

path "secret/data/shared/postgresql" {
  capabilities = ["read"]
}

path "secret/data/shared/mongodb" {
  capabilities = ["read"]
}

path "secret/data/shared/minio" {
  capabilities = ["read"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}
EOF

echo ""
echo "=========================================="
echo "Vault policies created successfully!"
echo "=========================================="

