resource "google_service_account" "runtime" {
  for_each = local.services

  project         = var.project_id
  account_id      = "${local.name_prefix}-${each.key}"
  display_name    = "Nexus v2 ${var.environment} ${each.key} runtime"
  description     = "Runtime identity for the Nexus v2 ${var.environment} ${each.key} Cloud Run service."
  deletion_policy = local.deletion_policy

  depends_on = [google_project_service.required["iam.googleapis.com"]]
}

# Runtime identities intentionally receive no project-wide roles in Phase 0.
# Resource access is added only when a deployed workload demonstrates a need.
