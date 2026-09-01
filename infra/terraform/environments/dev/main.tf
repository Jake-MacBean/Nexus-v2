provider "google" {
  project = var.project_id
  region  = var.region
}

module "nexus_environment" {
  source = "../../modules/nexus_environment"

  environment             = "dev"
  project_id              = var.project_id
  region                  = var.region
  bucket_location         = var.bucket_location
  container_images        = var.container_images
  cloud_sql_tier          = var.cloud_sql_tier
  cloud_run_max_instances = var.cloud_run_max_instances
  deletion_protection     = false
  enable_database_backups = false
}
