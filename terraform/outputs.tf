output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server URL"
  value       = module.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = module.acr.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = module.acr.admin_password
  sensitive   = true
}

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = module.aks.cluster_name
}

output "aks_fqdn" {
  description = "AKS FQDN"
  value       = module.aks.fqdn
}

output "aks_kube_config" {
  description = "AKS kubeconfig"
  value       = module.aks.kube_config
  sensitive   = true
}

output "vnet_id" {
  description = "Virtual network ID"
  value       = module.networking.vnet_id
}

output "subnet_ids" {
  description = "Subnet IDs"
  value       = module.networking.subnet_ids
}

output "dns_zone_name" {
  description = "DNS zone name"
  value       = var.dns_zone_name != "" ? module.dns[0].zone_name : null
}
