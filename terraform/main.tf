terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "sre-devops-portfolio"
  }
}

# Container Registry
module "acr" {
  source = "./modules/container-registry"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  registry_name       = var.acr_name
  sku                 = "Basic"
  admin_enabled       = true
}

# Networking
module "networking" {
  source = "./modules/networking"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  vnet_name           = var.vnet_name
  address_space       = var.vnet_address_space
  subnet_names        = var.subnet_names
  subnet_prefixes     = var.subnet_prefixes
}

# AKS Cluster
module "aks" {
  source = "./modules/aks"

  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  cluster_name                    = var.cluster_name
  dns_prefix                      = var.dns_prefix
  node_count                      = var.node_count
  vm_size                         = var.vm_size
  subnet_id                       = module.networking.subnet_ids["aks"]
  acr_id                          = module.acr.registry_id
  service_principal_client_id     = var.service_principal_client_id
  service_principal_client_secret = var.service_principal_client_secret
  kubernetes_version              = var.kubernetes_version != "" ? var.kubernetes_version : null
}

# DNS Zone (if domain is provided)
module "dns" {
  count = var.dns_zone_name != "" ? 1 : 0

  source = "./modules/dns"

  resource_group_name = azurerm_resource_group.main.name
  zone_name           = var.dns_zone_name
}
