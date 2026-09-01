resource "google_secret_manager_secret" "database_url" {
  project             = var.project_id
  secret_id           = "${local.name_prefix}-database-url"
  labels              = local.labels
  deletion_protection = var.deletion_protection
  deletion_policy     = local.deletion_policy

  replication {
    auto {}
  }

  depends_on = [google_project_service.required["secretmanager.googleapis.com"]]
}

# Secret payloads are deliberately absent. Deployment operations populate
# versions outside Terraform so no credential is written into Terraform state.
