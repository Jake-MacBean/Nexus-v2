resource "google_sql_database_instance" "postgres" {
  project          = var.project_id
  name             = "${local.name_prefix}-postgres"
  region           = var.region
  database_version = "POSTGRES_18"

  deletion_protection = var.deletion_protection
  deletion_policy     = local.deletion_policy

  settings {
    edition                     = "ENTERPRISE"
    tier                        = var.cloud_sql_tier
    availability_type           = "ZONAL"
    disk_type                   = "PD_SSD"
    disk_size                   = 10
    disk_autoresize             = true
    disk_autoresize_limit       = 50
    connector_enforcement       = "REQUIRED"
    deletion_protection_enabled = var.deletion_protection
    user_labels                 = local.labels

    backup_configuration {
      enabled                        = var.enable_database_backups
      point_in_time_recovery_enabled = var.enable_database_backups
    }

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "TRUSTED_CLIENT_CERTIFICATE_REQUIRED"
    }
  }

  depends_on = [google_project_service.required["sqladmin.googleapis.com"]]
}

resource "google_sql_database" "nexus" {
  project         = var.project_id
  name            = "nexus_v2_${var.environment}"
  instance        = google_sql_database_instance.postgres.name
  deletion_policy = local.deletion_policy
}

# No google_sql_user resource is created: passwords and database users are not
# generated into Terraform state by this foundation.
