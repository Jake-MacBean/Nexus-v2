provider "google" {
  project = local.project_id
}

locals {
  project_id                    = "nexus-dev-507820"
  project_number                = "240944005221"
  github_owner                  = "Jake-MacBean"
  github_owner_id               = "320386297"
  github_repository             = "Jake-MacBean/Nexus-v2"
  github_repository_id          = "1359498144"
  github_ref                    = "refs/heads/main"
  workload_identity_pool_id     = "nexus-github"
  workload_identity_provider_id = "nexus-v2"

  identity_services = toset([
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "serviceusage.googleapis.com",
    "sts.googleapis.com",
  ])
}

resource "google_project_service" "identity" {
  for_each = local.identity_services

  project            = local.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = local.project_id
  workload_identity_pool_id = local.workload_identity_pool_id
  display_name              = "Nexus GitHub Actions"
  description               = "GitHub Actions identities trusted for Nexus v2 development."
  disabled                  = false

  depends_on = [google_project_service.identity]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = local.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = local.workload_identity_provider_id
  display_name                       = "Nexus v2 GitHub"
  description                        = "Immutable Nexus v2 repository and owner identity, restricted to main."

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository"          = "assertion.repository"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner"    = "assertion.repository_owner"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.ref"                 = "assertion.ref"
  }

  attribute_condition = "assertion.repository_id == '${local.github_repository_id}' && assertion.repository_owner_id == '${local.github_owner_id}' && assertion.ref == '${local.github_ref}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com/"
  }

  depends_on = [google_project_service.identity]
}

resource "google_service_account" "deployer" {
  project      = local.project_id
  account_id   = "nexus-dev-deployer"
  display_name = "Nexus dev GitHub deployer"
  description  = "Short-lived GitHub Actions deployment identity for Nexus v2 development."

  depends_on = [google_project_service.identity]
}

resource "google_service_account_iam_member" "github_workload_identity_user" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_id/${local.github_repository_id}"
}

resource "google_project_iam_member" "deployer_project_browser" {
  project = local.project_id
  role    = "roles/browser"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
