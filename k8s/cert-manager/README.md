# Cert-Manager Configuration

TLS/HTTPS configuration using cert-manager with Let's Encrypt.

## Prerequisites

1. Install cert-manager:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. Verify installation:
```bash
kubectl get pods -n cert-manager
```

## Configuration

### ClusterIssuer

The `cluster-issuer.yaml` file configures Let's Encrypt issuers:
- **letsencrypt-prod**: Production issuer (rate-limited)
- **letsencrypt-staging**: Staging issuer (for testing, no rate limits)

**Important:** Update the email address in `cluster-issuer.yaml` before applying.

### Using TLS Ingress

1. Update the domain in the TLS ingress files:
   - `k8s/ingress/react-frontend-ingress-tls.yaml`
   - `k8s/ingress/js-gateway-ingress-tls.yaml`

2. Apply the ClusterIssuer first:
```bash
kubectl apply -f k8s/cert-manager/cluster-issuer.yaml
```

3. Apply the TLS ingress:
```bash
kubectl apply -f k8s/ingress/react-frontend-ingress-tls.yaml
kubectl apply -f k8s/ingress/js-gateway-ingress-tls.yaml
```

4. Check certificate status:
```bash
kubectl get certificate
kubectl describe certificate react-frontend-tls
```

## Certificate Renewal

Cert-manager automatically renews certificates before expiration (30 days before expiry).

## Troubleshooting

- Check cert-manager logs:
```bash
kubectl logs -n cert-manager -l app=cert-manager
```

- Check certificate request status:
```bash
kubectl get certificaterequest
kubectl describe certificaterequest <name>
```

- For staging, use `letsencrypt-staging` issuer first to avoid rate limits during testing

