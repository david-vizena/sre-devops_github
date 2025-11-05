# Security Best Practices

This document outlines the security measures implemented in this portfolio project.

## Secrets Management

### ✅ Protected Files
- `terraform/terraform.tfvars` - Contains Azure credentials (NOT in git, .gitignore)
- `terraform/*.tfstate*` - Contains sensitive infrastructure state (NOT in git, .gitignore)
- Kubernetes secrets - Created at runtime, never committed

### ✅ Secure Configuration

#### Terraform Variables
- Service principal credentials are marked as `sensitive = true`
- `terraform.tfvars` is in `.gitignore` and never committed
- Only `terraform.tfvars.example` (with placeholders) is in git

#### Kubernetes Secrets
- **ACR Secret**: Created at runtime with `kubectl create secret`
- **Grafana Admin**: Stored in Kubernetes Secret `grafana-admin`
- **ArgoCD Password**: Stored in Kubernetes Secret (auto-generated)
- All secrets are stored in Kubernetes, never in code

#### Environment Variables
- `.env` files are in `.gitignore`
- No hardcoded credentials in application code
- Service URLs use Kubernetes service discovery

## Access Credentials

### Getting Credentials Safely

**Never commit passwords or credentials to git!**

```bash
# ArgoCD Admin Password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Grafana Admin Password
kubectl get secret grafana-admin -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d

# ACR Credentials
az acr credential show --name acrsredevops
```

## Security Checklist

- ✅ No credentials in git
- ✅ Terraform state files excluded
- ✅ Kubernetes secrets used for sensitive data
- ✅ Service principal credentials in variables (not hardcoded)
- ✅ .gitignore properly configured
- ✅ No API keys or tokens in code
- ✅ Secrets rotated/changed after initial setup

## Production Recommendations

For production environments, consider:

1. **Azure Key Vault** - Store secrets in Azure Key Vault
2. **Sealed Secrets** - Encrypt Kubernetes secrets before committing
3. **RBAC** - Implement proper role-based access control
4. **Network Policies** - Restrict pod-to-pod communication
5. **TLS/SSL** - Enable HTTPS for all services
6. **Secret Rotation** - Regularly rotate all passwords and keys
7. **Audit Logging** - Enable audit logs for all access

## Rotating Credentials

If you suspect credentials were exposed:

1. **ArgoCD**: Reset password via secret
2. **Grafana**: Update secret and restart deployment
3. **ACR**: Regenerate admin credentials
4. **Service Principal**: Create new service principal and update Terraform

## Security Notes for Portfolio

This is a portfolio project demonstrating DevOps practices. For production:
- Use managed identities instead of service principals where possible
- Implement proper secret management (Azure Key Vault, HashiCorp Vault)
- Enable Azure AD integration for AKS
- Use network security groups and firewall rules
- Implement proper backup and disaster recovery

