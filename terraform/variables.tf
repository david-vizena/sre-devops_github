variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-sre-devops-portfolio"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "acr_name" {
  description = "Name of the Azure Container Registry"
  type        = string
  default     = "acrsredevops"
  validation {
    condition     = can(regex("^[a-z0-9]{5,50}$", var.acr_name))
    error_message = "ACR name must be lowercase alphanumeric and between 5-50 characters."
  }
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
  default     = "vnet-sre-devops"
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_names" {
  description = "Names of subnets"
  type        = map(string)
  default = {
    aks = "subnet-aks"
  }
}

variable "subnet_prefixes" {
  description = "Address prefixes for subnets"
  type        = map(string)
  default = {
    aks = "10.0.1.0/24"
  }
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "aks-sre-devops"
}

variable "dns_prefix" {
  description = "DNS prefix for AKS cluster"
  type        = string
  default     = "sre-devops"
}

variable "node_count" {
  description = "Number of nodes in the default node pool"
  type        = number
  default     = 3
}

variable "vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_B2s"
}

variable "service_principal_client_id" {
  description = "Service principal client ID for AKS"
  type        = string
  sensitive   = true
}

variable "service_principal_client_secret" {
  description = "Service principal client secret for AKS"
  type        = string
  sensitive   = true
}

variable "dns_zone_name" {
  description = "DNS zone name (optional, leave empty to skip DNS setup)"
  type        = string
  default     = ""
}
