# Policy for Vault Agent Sidecar
# Allows reading secrets for the service it's attached to

path "secret/data/*" {
  capabilities = ["read"]
}

path "secret/metadata/*" {
  capabilities = ["list", "read"]
}

