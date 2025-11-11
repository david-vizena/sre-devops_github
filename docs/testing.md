# Build, Deploy, and Test Workflow

This runbook captures the commands we used to rebuild container images, roll them out to AKS, and validate the cross-service transaction + analytics flow end-to-end. Adapt the sample payloads as needed, but keep the overall order so that caches, queues, and downstream stores stay in sync.

---

## 1. Prerequisites

- Docker Desktop (or another Docker daemon) is running locally.
- You are authenticated to Azure and the target ACR:
  ```bash
  az login
  az acr login --name acrsredevops
  ```
- `kubectl config current-context` points at the AKS cluster.
- Never hard-code credentials—pull them from Kubernetes Secrets on demand when a verification step requires it.

---

## 2. Rebuild and Push Service Images

Build for the `linux/amd64` architecture so the images run on AKS nodes:

```bash
# js-gateway
docker build --platform linux/amd64 \
  -t acrsredevops.azurecr.io/js-gateway:latest \
  applications/js-gateway

# python analytics worker
docker build --platform linux/amd64 \
  -t acrsredevops.azurecr.io/python-service:latest \
  applications/python-service

docker push acrsredevops.azurecr.io/js-gateway:latest
docker push acrsredevops.azurecr.io/python-service:latest
```

---

## 3. Roll Out the Updated Workloads

```bash
kubectl rollout restart deploy/js-gateway -n default
kubectl rollout restart deploy/python-service-worker -n default

kubectl get pods -n default
```

Wait for the new pods to report `READY` before moving on.

---

## 4. End-to-End Validation

### 4.1 Submit a Transaction Through the Gateway

Run the test from inside the cluster (no port-forward required):

```bash
kubectl run curl-test --image=curlimages/curl -n default --restart=Never \
  --command -- curl -s -i \
  -X POST http://js-gateway.default.svc.cluster.local:8082/api/v1/process-transaction \
  -H 'Content-Type: application/json' \
  -d '{
        "customer_id": "cust-101",
        "items": [
          { "id": "item-7", "name": "Standing Desk", "price": 699.00, "quantity": 1, "category": "furniture" },
          { "id": "item-8", "name": "LED Strip", "price": 24.99, "quantity": 4, "category": "accessories" }
        ],
        "discount_code": "OFFICEUP"
      }'

kubectl logs curl-test -n default
kubectl delete pod curl-test -n default
```

Record the `transaction_id` from the response.

### 4.2 Fetch Transaction via Gateway (Cache Verification)

```bash
TRANSACTION_ID=<id from previous step>

kubectl run curl-test --image=curlimages/curl -n default --restart=Never \
  --command -- curl -s -i \
  http://js-gateway.default.svc.cluster.local:8082/api/v1/transactions/${TRANSACTION_ID}
kubectl logs curl-test -n default   # expect X-Cache: MISS
kubectl delete pod curl-test -n default

kubectl run curl-test --image=curlimages/curl -n default --restart=Never \
  --command -- curl -s -i \
  http://js-gateway.default.svc.cluster.local:8082/api/v1/transactions/${TRANSACTION_ID}
kubectl logs curl-test -n default   # expect X-Cache: HIT
kubectl delete pod curl-test -n default
```

### 4.3 Worker Logs and RabbitMQ Queue

```bash
kubectl logs deploy/python-service-worker -n default --since=5m
# Look for: "Stored analytics for transaction … (inserted)"

kubectl exec rabbitmq-rabbitmq-0 -n data-services \
  -- rabbitmqctl list_queues name messages
# Expect analytics.events queue length = 0
```

### 4.4 MongoDB Verification

Retrieve the MongoDB password when needed (no secrets in source control):

```bash
MONGO_PASS=$(kubectl get secret -n data-services mongodb-mongodb \
  -o jsonpath='{.data.mongodb-root-password}' | base64 --decode)

kubectl exec -n data-services mongodb-mongodb-0 -- \
  mongosh "mongodb://root:${MONGO_PASS}@mongodb-mongodb.data-services.svc.cluster.local:27017/analytics?authSource=admin" \
  --eval 'db.transactions_summary.find({}, {transaction_id:1, "totals.total":1, last_updated:1, _id:0}).sort({last_updated:-1}).limit(3).forEach(doc => printjson(doc))'
```

Confirm the latest document matches the `transaction_id` and totals from the test payload.

### 4.5 (Optional) PostgreSQL Check

```bash
PG_PASS=$(kubectl get secret -n data-services postgresql-postgresql \
  -o jsonpath='{.data.app-password}' | base64 --decode)

kubectl exec -n data-services postgresql-postgresql-0 -- \
  env PGPASSWORD=$PG_PASS \
  psql -U app_user -d portfolio \
  -c "SELECT id, subtotal, total, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;"
```

---

## 5. Housekeeping

- Clean up temporary `curl-test` pods if any are left.
- Restore normal replica counts after capacity adjustments (e.g. `kubectl scale deploy/js-gateway --replicas=2 -n default`) once the AKS node pool has sufficient headroom.
- Commit the updated documentation and any code changes, then push:
  ```bash
  git status
  git add docs/testing.md
  git commit -m "Document build/deploy/test workflow"
  git push
  ```

---

## Notes

- Keep secrets out of Git by sourcing them from Kubernetes on demand.
- If `git push` throws a certificate error after OS upgrades, reinstall the Git tooling or point Git at a valid CA bundle instead of disabling SSL verification.
- Update this runbook whenever the payload schema, deployment flow, or supporting services change so it remains a single source of truth for validation steps.


