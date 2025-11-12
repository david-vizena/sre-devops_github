# HashiCorp Vault Setup

This directory contains the Vault configuration for secrets management.

## Architecture

Vault is deployed as a StatefulSet in the `data-services` namespace. Services authenticate to Vault using Kubernetes service accounts, and secrets are injected via Vault Agent Sidecar pattern.

## Directory Structure

```
k8s/vault/
├── README.md                    # This file
├── policies/                    # Vault policies
│   ├── js-gateway-policy.hcl
│   ├── go-service-policy.hcl
│   └── python-service-policy.hcl
├── auth-roles/                  # Kubernetes auth role configs
│   ├── js-gateway-role.yaml
│   ├── go-service-role.yaml
│   └── python-service-role.yaml
└── scripts/                     # Setup scripts
    ├── init-vault.sh           # Initialize Vault
    ├── setup-policies.sh       # Create policies
    ├── setup-auth-roles.sh     # Create auth roles
    └── migrate-secrets.sh      # Migrate secrets from K8s to Vault
```

## Deployment Steps

### 1. Deploy Vault

```bash
# Install Vault Helm chart
helm install vault ./charts/local/vault -n data-services

# Wait for Vault pod to be ready
kubectl wait --for=condition=ready pod/vault-vault-0 -n data-services --timeout=300s
```

### 2. Initialize Vault

```bash
# Run initialization script
cd k8s/vault/scripts
./init-vault.sh

# Save the unseal key and root token securely!
```

### 3. Create Vault Policies

```bash
# Set your Vault root token
export VAULT_TOKEN="your-root-token-here"

# Create policies
./setup-policies.sh
```

### 4. Create Kubernetes Auth Roles

```bash
# Create auth roles
./setup-auth-roles.sh
```

### 5. Migrate Secrets to Vault

```bash
# Migrate secrets from Kubernetes Secrets to Vault
./migrate-secrets.sh
```

### 6. Update Deployments

Update service deployments to use Vault Agent Sidecar pattern (see `deployment-vault.yaml` examples).

## Accessing Vault

### Vault UI

```bash
# Port-forward to Vault
kubectl port-forward svc/vault-vault -n data-services 8200:8200

# Open browser to http://localhost:8200
# Login with root token
```

### Vault CLI

```bash
# Access Vault CLI in pod
kubectl exec -it vault-vault-0 -n data-services -- vault status

# Set Vault address
export VAULT_ADDR="http://vault-vault.data-services.svc.cluster.local:8200"
export VAULT_TOKEN="your-root-token-here"

# Test authentication
vault auth -method=kubernetes role=js-gateway
```

## Vault Agent Sidecar Pattern

The Vault Agent Sidecar pattern works as follows:

1. **Vault Agent Sidecar**: Runs alongside the main container
2. **Authentication**: Uses Kubernetes service account to authenticate to Vault
3. **Secret Fetching**: Fetches secrets from Vault based on policy
4. **Secret Rendering**: Renders secrets to a file using templates
5. **Main Container**: Sources the rendered file to get environment variables

### Example Deployment

See `k8s/applications/js-gateway/deployment-vault.yaml` for an example of how to add Vault Agent Sidecar to a deployment.

## Secrets Structure in Vault

Secrets are stored in Vault using the KV v2 secrets engine:

- `secret/data/shared/redis` - Redis password
- `secret/data/shared/rabbitmq` - RabbitMQ credentials
- `secret/data/shared/postgresql` - PostgreSQL credentials
- `secret/data/shared/mongodb` - MongoDB credentials
- `secret/data/shared/minio` - MinIO credentials

## Policies

Each service has a policy that defines what secrets it can access:

- **js-gateway-policy**: Access to Redis, RabbitMQ, PostgreSQL
- **go-service-policy**: Access to PostgreSQL
- **python-service-policy**: Access to RabbitMQ, PostgreSQL, MongoDB, MinIO

## Security Considerations

1. **Root Token**: Store securely, never commit to Git
2. **Unseal Keys**: Store securely, required to unseal Vault after restart
3. **Policies**: Follow principle of least privilege
4. **TTL**: Set appropriate TTLs for tokens (default: 1 hour)
5. **Audit Logging**: Enabled by default for compliance

## Troubleshooting

### Vault is sealed

```bash
# Unseal Vault
kubectl exec -it vault-vault-0 -n data-services -- vault operator unseal <unseal-key>
```

### Service can't authenticate

```bash
# Check service account exists
kubectl get serviceaccount js-gateway -n default

# Check auth role exists
kubectl exec -it vault-vault-0 -n data-services -- vault read auth/kubernetes/role/js-gateway

# Test authentication
kubectl exec -it deployment/js-gateway -n default -- env | grep VAULT
```

### Secrets not found

```bash
# Check if secret exists in Vault
kubectl exec -it vault-vault-0 -n data-services -- vault kv get secret/data/shared/redis

# Check policy allows access
kubectl exec -it vault-vault-0 -n data-services -- vault policy read js-gateway-policy
```

## Migration from Kubernetes Secrets

After migrating to Vault, you can optionally remove Kubernetes Secrets (but keep them as backup):

```bash
# Backup K8s secrets first!
kubectl get secrets -n data-services -o yaml > secrets-backup.yaml

# After verifying Vault works, you can delete K8s secrets
# (Don't do this until you're sure Vault is working!)
```

## Next Steps

1. Enable TLS for Vault (production)
2. Set up Vault HA with Consul backend
3. Configure dynamic secrets (database credentials)
4. Set up secret rotation
5. Integrate with Azure Key Vault as backend

