#!/bin/bash
# PostgreSQL Backup Script
# Backs up PostgreSQL databases and stores them in MinIO (S3-compatible storage)

set -euo pipefail

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgresql-postgresql.data-services.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-portfolio}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# MinIO configuration (optional - can be used for off-cluster storage)
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio.data-services.svc.cluster.local:9000}"
MINIO_BUCKET="${MINIO_BUCKET:-backups}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/postgres_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Starting PostgreSQL backup for database: ${POSTGRES_DB}"
echo "Backup file: ${BACKUP_FILE}"

# Perform backup
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --clean \
  --if-exists \
  --create \
  | gzip > "${BACKUP_FILE}"

# Verify backup was created
if [ ! -f "${BACKUP_FILE}" ] || [ ! -s "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file was not created or is empty"
  exit 1
fi

echo "Backup completed successfully. Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Upload to MinIO if credentials are provided
if [ -n "${MINIO_ACCESS_KEY}" ] && [ -n "${MINIO_SECRET_KEY}" ]; then
  echo "Uploading backup to MinIO..."
  
  # Install mc (MinIO client) if not available
  if ! command -v mc &> /dev/null; then
    echo "Installing MinIO client..."
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
    chmod +x /tmp/mc
    export PATH="/tmp:${PATH}"
  fi
  
  # Configure MinIO client
  mc alias set backup "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" 2>/dev/null || true
  
  # Create bucket if it doesn't exist
  mc mb "backup/${MINIO_BUCKET}" 2>/dev/null || true
  
  # Upload backup
  mc cp "${BACKUP_FILE}" "backup/${MINIO_BUCKET}/postgres/" || {
    echo "WARNING: Failed to upload to MinIO, but local backup succeeded"
  }
fi

# Cleanup old backups (local)
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "postgres_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup process completed"

