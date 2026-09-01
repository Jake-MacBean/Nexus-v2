output "environment" {
  description = "Fixed Nexus environment identity."
  value       = var.environment
}

output "project_id" {
  description = "Google Cloud project dedicated to this environment."
  value       = var.project_id
}

output "enabled_google_apis" {
  description = "Google APIs managed by the foundation."
  value       = sort(tolist(local.required_google_apis))
}

output "artifact_registry" {
  description = "Canonical Docker repository identity."
  value = {
    id   = google_artifact_registry_repository.containers.id
    name = google_artifact_registry_repository.containers.repository_id
    url  = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
  }
}

output "cloud_run_services" {
  description = "Cloud Run service and runtime identity map."
  value = {
    for service_name, service in google_cloud_run_v2_service.service : service_name => {
      name                    = service.name
      uri                     = service.uri
      runtime_service_account = google_service_account.runtime[service_name].email
    }
  }
}

output "cloud_sql" {
  description = "Cloud SQL instance and database identity."
  value = {
    instance_name   = google_sql_database_instance.postgres.name
    connection_name = google_sql_database_instance.postgres.connection_name
    database_name   = google_sql_database.nexus.name
  }
}

output "document_bucket_name" {
  description = "Environment document/object bucket."
  value       = google_storage_bucket.documents.name
}

output "database_url_secret_id" {
  description = "Secret Manager container reserved for DATABASE_URL; it has no version or payload."
  value       = google_secret_manager_secret.database_url.secret_id
}
