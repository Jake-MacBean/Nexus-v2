resource "google_artifact_registry_repository" "containers" {
  project         = var.project_id
  location        = var.region
  repository_id   = "${local.name_prefix}-containers"
  description     = "Container images for Nexus v2 ${var.environment}."
  format          = "DOCKER"
  labels          = local.labels
  deletion_policy = local.deletion_policy

  depends_on = [google_project_service.required["artifactregistry.googleapis.com"]]
}
