variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the container registry"
  type        = string
}

variable "registry_name" {
  description = "Name of the Azure Container Registry"
  type        = string
}

variable "sku" {
  description = "SKU for the container registry (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "admin_enabled" {
  description = "Enable admin user for the container registry"
  type        = bool
  default     = false
}

