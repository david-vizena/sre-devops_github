terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name           = "default"
    node_count     = var.node_count
    vm_size        = var.vm_size
    vnet_subnet_id = var.subnet_id
  }

  service_principal {
    client_id     = var.service_principal_client_id
    client_secret = var.service_principal_client_secret
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "172.16.0.0/16" # Kubernetes service CIDR (must not overlap with VNet)
    dns_service_ip    = "172.16.0.10"   # Must be within service_cidr
    # Note: pod_cidr is not needed with Azure CNI - it uses VNet directly
  }

  role_based_access_control_enabled = true

  tags = {
    Environment = "production"
    Project     = "sre-devops-portfolio"
  }
}

# Grant AKS access to ACR
# Note: Using service principal object ID instead of kubelet_identity
# when service principal authentication is used
data "azurerm_client_config" "current" {}

data "azuread_service_principal" "aks_sp" {
  client_id = var.service_principal_client_id
}

resource "azurerm_role_assignment" "acr" {
  principal_id                     = data.azuread_service_principal.aks_sp.object_id
  role_definition_name             = "AcrPull"
  scope                            = var.acr_id
  skip_service_principal_aad_check = true
}

