# Policy for python-service-worker
# Allows read access to RabbitMQ, PostgreSQL, MongoDB, and MinIO secrets

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

# Allow reading metadata
path "secret/metadata/*" {
  capabilities = ["list", "read"]
}

