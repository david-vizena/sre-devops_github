variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the AKS cluster"
  type        = string
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
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

variable "subnet_id" {
  description = "Subnet ID for the AKS cluster"
  type        = string
}

variable "acr_id" {
  description = "Azure Container Registry resource ID"
  type        = string
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

variable "kubernetes_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = null
}

