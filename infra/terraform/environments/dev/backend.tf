terraform {
  required_version = "= 1.16.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "= 8.1.0"
    }
  }

  backend "gcs" {
    prefix = "nexus-v2/dev"
  }
}
