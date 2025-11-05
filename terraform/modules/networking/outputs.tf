output "vnet_id" {
  description = "Resource ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "subnet_ids" {
  description = "Map of subnet keys to subnet resource IDs"
  value       = { for k, subnet in azurerm_subnet.subnets : k => subnet.id }
}

output "subnet_names" {
  description = "Map of subnet keys to subnet names"
  value       = { for k, subnet in azurerm_subnet.subnets : k => subnet.name }
}

