output "environment_summary" {
  description = "Non-sensitive identities for the Nexus development foundation."
  value = {
    environment            = module.nexus_environment.environment
    project_id             = module.nexus_environment.project_id
    enabled_google_apis    = module.nexus_environment.enabled_google_apis
    artifact_registry      = module.nexus_environment.artifact_registry
    cloud_run_services     = module.nexus_environment.cloud_run_services
    cloud_sql              = module.nexus_environment.cloud_sql
    document_bucket_name   = module.nexus_environment.document_bucket_name
    database_url_secret_id = module.nexus_environment.database_url_secret_id
  }
}
