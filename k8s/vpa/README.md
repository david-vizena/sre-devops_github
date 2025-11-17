# Vertical Pod Autoscaler (VPA)

VPA automatically adjusts CPU and memory requests and limits for containers based on historical usage.

## What is VPA?

Unlike Horizontal Pod Autoscaler (HPA) which scales the number of pods, VPA:
- Adjusts resource requests/limits for existing pods
- Recommends optimal resource allocation
- Can automatically update resource requests (requires pod recreation)

## Files

- `vpa.yaml`: VPA configurations for all services

## VPA Modes

1. **Off**: VPA only provides recommendations (no automatic changes)
2. **Initial**: VPA sets resource requests on pod creation only
3. **Auto**: VPA updates resource requests on pod recreation (requires pod restart)
4. **Recreate**: VPA recreates pods when resource recommendations change significantly

## Current Configuration

The VPA is configured in "Off" mode for safety, providing recommendations without automatic changes.

## Usage

1. **Deploy VPA**:
   ```bash
   kubectl apply -f k8s/vpa/
   ```

2. **Check VPA recommendations**:
   ```bash
   kubectl describe vpa <vpa-name>
   ```

3. **View recommendations**:
   ```bash
   kubectl get vpa
   ```

## Benefits

- **Cost Optimization**: Right-size resources based on actual usage
- **Performance**: Prevent over-provisioning or under-provisioning
- **Efficiency**: Automatically adjust to workload patterns

## Considerations

- VPA recommendations require pod recreation to take effect
- Use with caution in production (start with "Off" mode)
- Monitor recommendations before enabling "Auto" mode
- VPA and HPA can conflict on CPU/memory metrics - coordinate carefully

