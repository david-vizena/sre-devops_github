terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

resource "azurerm_virtual_network" "main" {
  name                = var.vnet_name
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = var.address_space

  tags = {
    Environment = "production"
    Project     = "sre-devops-portfolio"
  }
}

resource "azurerm_subnet" "subnets" {
  for_each = var.subnet_names

  name                 = each.value
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_prefixes[each.key]]
}

