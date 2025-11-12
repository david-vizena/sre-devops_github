#!/bin/bash
# Vault initialization script
# This script initializes Vault, unseals it, and sets up Kubernetes auth

set -e

VAULT_POD="vault-vault-0"
VAULT_NAMESPACE="data-services"
VAULT_ADDR="http://127.0.0.1:8200"

echo "=========================================="
echo "Vault Initialization Script"
echo "=========================================="
echo ""

# Check if Vault pod is running
echo "Checking if Vault pod is running..."
if ! kubectl get pod "$VAULT_POD" -n "$VAULT_NAMESPACE" &>/dev/null; then
    echo "Error: Vault pod not found. Please deploy Vault first."
    exit 1
fi

# Check if Vault is initialized
echo "Checking if Vault is initialized..."
if kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- vault status &>/dev/null; then
    echo "Vault is already initialized and unsealed."
    exit 0
fi

# Initialize Vault
echo "Initializing Vault..."
INIT_OUTPUT=$(kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- vault operator init -key-shares=1 -key-threshold=1 -format=json)

# Extract unseal key and root token
UNSEAL_KEY=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')

echo ""
echo "=========================================="
echo "IMPORTANT: Save these credentials securely!"
echo "=========================================="
echo "Unseal Key: $UNSEAL_KEY"
echo "Root Token: $ROOT_TOKEN"
echo ""
echo "Press Enter to continue..."
read -r

# Unseal Vault
echo "Unsealing Vault..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- vault operator unseal "$UNSEAL_KEY"

# Enable Kubernetes auth
echo "Enabling Kubernetes auth backend..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$ROOT_TOKEN" vault auth enable kubernetes

# Get Kubernetes service account token
echo "Configuring Kubernetes auth..."
TOKEN_REVIEWER_JWT=$(kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- cat /var/run/secrets/kubernetes.io/serviceaccount/token)
KUBERNETES_HOST="https://$(kubectl get service kubernetes -n default -o jsonpath='{.spec.clusterIP}'):443"
KUBERNETES_CA_CERT=$(kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt | base64 | tr -d '\n')

kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$ROOT_TOKEN" vault write auth/kubernetes/config \
    token_reviewer_jwt="$TOKEN_REVIEWER_JWT" \
    kubernetes_host="$KUBERNETES_HOST" \
    kubernetes_ca_cert="$KUBERNETES_CA_CERT"

# Enable KV v2 secrets engine
echo "Enabling KV v2 secrets engine..."
kubectl exec "$VAULT_POD" -n "$VAULT_NAMESPACE" -- env VAULT_TOKEN="$ROOT_TOKEN" vault secrets enable -version=2 -path=secret kv

echo ""
echo "=========================================="
echo "Vault initialization complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Create Vault policies (see k8s/vault/policies/)"
echo "2. Create Kubernetes auth roles (see k8s/vault/auth-roles/)"
echo "3. Migrate secrets from Kubernetes Secrets to Vault"
echo "4. Update deployments to use Vault Agent Sidecar"

