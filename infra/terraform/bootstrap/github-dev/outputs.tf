output "project_identity" {
  description = "Development project ID and immutable number used by the trust path."
  value = {
    id     = local.project_id
    number = local.project_number
  }
}

output "github_identity" {
  description = "Expected GitHub owner, repository, immutable IDs, and trusted branch."
  value = {
    owner         = local.github_owner
    owner_id      = local.github_owner_id
    repository    = local.github_repository
    repository_id = local.github_repository_id
    ref           = local.github_ref
  }
}

output "workload_identity_pool_name" {
  description = "Full immutable workload identity pool resource name."
  value       = google_iam_workload_identity_pool.github.name
}

output "workload_identity_provider_name" {
  description = "Full immutable workload identity provider resource name consumed by GitHub Actions."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account_email" {
  description = "Dedicated development deployment identity impersonated by GitHub Actions."
  value       = google_service_account.deployer.email
}

output "enabled_identity_services" {
  description = "Control-plane APIs kept enabled when this bootstrap root is destroyed."
  value       = sort(tolist(local.identity_services))
}
