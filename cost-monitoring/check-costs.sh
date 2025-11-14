#!/bin/bash
# Azure Cost Monitoring Script
# Checks Azure costs and sends alerts if thresholds are exceeded

set -euo pipefail

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-sre-devops-portfolio}"
DAILY_THRESHOLD_USD="${DAILY_THRESHOLD_USD:-5.00}"
MONTHLY_THRESHOLD_USD="${MONTHLY_THRESHOLD_USD:-150.00}"

echo "Checking Azure costs for resource group: ${RESOURCE_GROUP}"

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
  echo "ERROR: Azure CLI not found. Install it first: https://aka.ms/InstallAzureCLI"
  exit 1
fi

# Get current date range
TODAY=$(date +%Y-%m-%d)
START_OF_MONTH=$(date +%Y-%m-01)

# Get cost for today
echo "Fetching today's costs..."
DAILY_COST=$(az consumption usage list \
  --start-date "${TODAY}" \
  --end-date "${TODAY}" \
  --query "[?contains(instanceName, '${RESOURCE_GROUP}')].{Cost:pretaxCost}" \
  --output tsv | awk '{sum+=$1} END {print sum}' || echo "0")

# Get cost for current month
echo "Fetching monthly costs..."
MONTHLY_COST=$(az consumption usage list \
  --start-date "${START_OF_MONTH}" \
  --end-date "${TODAY}" \
  --query "[?contains(instanceName, '${RESOURCE_GROUP}')].{Cost:pretaxCost}" \
  --output tsv | awk '{sum+=$1} END {print sum}' || echo "0")

echo "Daily cost: \$${DAILY_COST}"
echo "Monthly cost (so far): \$${MONTHLY_COST}"

# Check thresholds
ALERT=false

if (( $(echo "${DAILY_COST} > ${DAILY_THRESHOLD_USD}" | bc -l) )); then
  echo "⚠️  ALERT: Daily cost (\$${DAILY_COST}) exceeds threshold (\$${DAILY_THRESHOLD_USD})"
  ALERT=true
fi

if (( $(echo "${MONTHLY_COST} > ${MONTHLY_THRESHOLD_USD}" | bc -l) )); then
  echo "⚠️  ALERT: Monthly cost (\$${MONTHLY_COST}) exceeds threshold (\$${MONTHLY_THRESHOLD_USD})"
  ALERT=true
fi

if [ "${ALERT}" = false ]; then
  echo "✅ Costs are within thresholds"
  exit 0
else
  echo "❌ Cost thresholds exceeded"
  # In production, send alert via email/Slack/PagerDuty here
  exit 1
fi

