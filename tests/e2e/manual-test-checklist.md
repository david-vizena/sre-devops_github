# Manual End-to-End Testing Checklist

This checklist should be used after automated tests pass to verify the full application stack manually.

## Prerequisites

- [ ] All services deployed and running
- [ ] Ingress configured with external IP
- [ ] kubectl access to cluster configured
- [ ] Browser access to ingress IP

## 1. Frontend Access

- [ ] Navigate to `http://<INGRESS_IP>` or `http://<INGRESS_IP>/`
- [ ] Frontend loads without errors
- [ ] UI displays correctly (React app)
- [ ] No console errors in browser developer tools

## 2. API Gateway Health

- [ ] Navigate to `http://<INGRESS_IP>/api/health`
- [ ] Returns `200 OK` with JSON response
- [ ] Response includes service status information

## 3. Service Health Checks

- [ ] Go Service: `http://<INGRESS_IP>/api/v1/services/go/health`
- [ ] Python Service: `http://<INGRESS_IP>/api/v1/services/python/health`
- [ ] Auth Service: `http://<INGRESS_IP>/api/v1/auth/health`

All should return `200 OK` with healthy status.

## 4. Transaction Flow

- [ ] Open frontend in browser
- [ ] Fill out transaction form
- [ ] Submit transaction
- [ ] Transaction is processed successfully
- [ ] Response shows transaction ID
- [ ] Transaction appears in analytics

## 5. Authentication Flow

- [ ] Navigate to registration endpoint: `http://<INGRESS_IP>/api/v1/auth/register`
- [ ] Register a new user (POST request)
- [ ] User is created successfully
- [ ] Login with credentials: `http://<INGRESS_IP>/api/v1/auth/login`
- [ ] Receive JWT token
- [ ] Use token to access protected endpoints

## 6. Analytics Flow

- [ ] Process multiple transactions
- [ ] Navigate to analytics endpoint: `http://<INGRESS_IP>/api/v1/analyze`
- [ ] Analytics data is returned
- [ ] Data includes revenue, transaction counts, etc.
- [ ] Frontend analytics view shows data

## 7. Observability Stack

### Prometheus
- [ ] Navigate to `http://<INGRESS_IP>/prometheus` or port-forward
- [ ] Prometheus UI loads
- [ ] Metrics are being scraped
- [ ] Query `up` metric shows services are up
- [ ] Custom metrics visible (e.g., `http_requests_total`)

### Grafana
- [ ] Navigate to `http://<INGRESS_IP>/grafana`
- [ ] Login with admin credentials
- [ ] Dashboards load and display data
- [ ] Portfolio Overview dashboard shows metrics
- [ ] Analytics Pipeline dashboard shows data
- [ ] Prometheus datasource is configured correctly

### Jaeger
- [ ] Navigate to `http://<INGRESS_IP>/jaeger`
- [ ] Jaeger UI loads
- [ ] Traces appear when making requests
- [ ] Can see trace spans for:
  - [ ] API Gateway requests
  - [ ] Go Service calls
  - [ ] Python Service calls
  - [ ] Database queries

## 8. Vault Integration

- [ ] Verify Vault pod is running: `kubectl get pods -n monitoring -l app=vault`
- [ ] Check Vault status: `kubectl exec -n monitoring vault-0 -- vault status`
- [ ] Verify services using Vault have secrets mounted
- [ ] Check vault-agent logs in application pods

## 9. Database Connectivity

### PostgreSQL
- [ ] Verify PostgreSQL is running: `kubectl get pods -n data-services -l app=postgresql`
- [ ] Auth service can connect to PostgreSQL
- [ ] Users are stored in PostgreSQL database
- [ ] Database backups are configured (CronJob exists)

### MongoDB (if used)
- [ ] Verify MongoDB is running: `kubectl get pods -n data-services -l app=mongodb`
- [ ] Services can connect to MongoDB
- [ ] Data is being written to MongoDB

## 10. CI/CD Pipeline

- [ ] Push a change to main branch
- [ ] GitHub Actions workflows trigger:
  - [ ] Lint and Validate passes
  - [ ] Continuous Integration passes
  - [ ] Continuous Deployment passes
- [ ] Docker images are built and pushed to ACR
- [ ] ArgoCD detects changes (if configured)
- [ ] Services update with new images

## 11. Error Handling

- [ ] Kill a service pod: `kubectl delete pod <pod-name> -n default`
- [ ] Service recovers (new pod starts)
- [ ] Other services continue to work
- [ ] Circuit breakers prevent cascading failures
- [ ] Rate limiting works (make too many requests)

## 12. Security

- [ ] Network Policies are applied (if configured)
- [ ] Secrets are not in plain text (use Vault)
- [ ] HTTPS/TLS is configured (if configured)
- [ ] Authentication protects endpoints
- [ ] Rate limiting prevents abuse

## 13. Logging

- [ ] Loki is collecting logs: `kubectl get pods -n monitoring -l app=loki`
- [ ] Promtail is shipping logs: `kubectl get pods -n monitoring -l app=promtail`
- [ ] Logs appear in Grafana Loki datasource
- [ ] Can query logs in Grafana

## 14. Load Testing

- [ ] Run k6 load test script
- [ ] Services handle load gracefully
- [ ] No services crash under load
- [ ] Response times are acceptable
- [ ] Errors are minimal

## Test Results

Date: __________
Tester: __________
Environment: __________

**Overall Status**: [ ] PASS [ ] FAIL [ ] PARTIAL

**Issues Found**:
1. 
2. 
3. 

**Notes**:

