# Policy for go-service
# Allows read access to PostgreSQL secrets

path "secret/data/go-service/*" {
  capabilities = ["read"]
}

path "secret/data/shared/postgresql" {
  capabilities = ["read"]
}

# Allow reading metadata
path "secret/metadata/*" {
  capabilities = ["list", "read"]
}

