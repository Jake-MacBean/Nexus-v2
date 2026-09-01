resource "google_storage_bucket" "documents" {
  project  = var.project_id
  name     = "${var.project_id}-${local.name_prefix}-objects"
  location = var.bucket_location

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = !var.deletion_protection
  labels                      = local.labels
  deletion_policy             = local.deletion_policy

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.required["storage.googleapis.com"]]
}
