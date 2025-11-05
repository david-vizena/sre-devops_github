terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

resource "azurerm_dns_zone" "main" {
  name                = var.zone_name
  resource_group_name = var.resource_group_name

  tags = {
    Environment = "production"
    Project     = "sre-devops-portfolio"
  }
}

