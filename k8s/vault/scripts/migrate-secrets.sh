#!/bin/bash
# Script to migrate secrets from Kubernetes Secrets to Vault
# This script reads secrets from K8s and stores them in Vault

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
echo "Migrating Secrets to Vault"
echo "=========================================="
echo ""

# Function to migrate a secret from K8s to Vault
migrate_secret() {
    local secret_name=$1
    local vault_path=$2
    local namespace=${3:-default}
    
    echo "Migrating $secret_name to $vault_path..."
    
    # Get secret data from Kubernetes
    SECRET_DATA=$(kubectl get secret "$secret_name" -n "$namespace" -o json | jq -r '.data')
    
    # Convert base64 encoded values to JSON for Vault
    VAULT_JSON=$(echo "$SECRET_DATA" | jq -r 'to_entries | map({key: .key, value: (.value | @base64d)}) | from_entries')
    
    # Write to Vault
    kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$VAULT_TOKEN" vault kv put "$vault_path" \
        -format=json $(echo "$VAULT_JSON" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')
    
    echo "  ✓ Migrated $secret_name"
}

# Migrate Redis secret
if kubectl get secret redis-redis -n data-services &>/dev/null; then
    migrate_secret "redis-redis" "secret/data/shared/redis" "data-services"
fi

# Migrate RabbitMQ secret
if kubectl get secret rabbitmq-rabbitmq -n data-services &>/dev/null; then
    migrate_secret "rabbitmq-rabbitmq" "secret/data/shared/rabbitmq" "data-services"
fi

# Migrate PostgreSQL secret
if kubectl get secret postgresql-postgresql -n data-services &>/dev/null; then
    migrate_secret "postgresql-postgresql" "secret/data/shared/postgresql" "data-services"
fi

# Migrate MongoDB secret
if kubectl get secret mongodb-mongodb -n data-services &>/dev/null; then
    migrate_secret "mongodb-mongodb" "secret/data/shared/mongodb" "data-services"
fi

# Migrate MinIO secret
if kubectl get secret minio-minio -n data-services &>/dev/null; then
    migrate_secret "minio-minio" "secret/data/shared/minio" "data-services"
fi

echo ""
echo "=========================================="
echo "Secret migration complete!"
echo "=========================================="

