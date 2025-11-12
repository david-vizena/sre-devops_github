# Policy for js-gateway service
# Allows read access to Redis, RabbitMQ, and PostgreSQL secrets

path "secret/data/js-gateway" {
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

# Allow reading metadata
path "secret/metadata/*" {
  capabilities = ["list", "read"]
}

