variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the virtual network"
  type        = string
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
}

variable "address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
}

variable "subnet_names" {
  description = "Map of subnet keys to subnet names"
  type        = map(string)
}

variable "subnet_prefixes" {
  description = "Map of subnet keys to address prefixes"
  type        = map(string)
}

