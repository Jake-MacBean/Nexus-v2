locals {
  required_google_apis = toset([
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_google_apis

  project                    = var.project_id
  service                    = each.value
  deletion_policy            = local.deletion_policy
  disable_on_destroy         = false
  disable_dependent_services = false
}
