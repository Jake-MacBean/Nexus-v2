variable "project_id" {
  description = "Future Google Cloud project dedicated to Nexus production; it must contain prod."
  type        = string

  validation {
    condition = (
      can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id)) &&
      strcontains(lower(var.project_id), "prod")
    )
    error_message = "The prod project_id must be a valid Google Cloud project ID containing prod."
  }
}

variable "region" {
  description = "Reviewed Google Cloud region for future production resources."
  type        = string
}

variable "bucket_location" {
  description = "Reviewed Cloud Storage location for future production objects."
  type        = string
}

variable "container_images" {
  description = "Reviewed immutable production image URIs for web, API, and worker."
  type = object({
    web    = string
    api    = string
    worker = string
  })
}

variable "cloud_sql_tier" {
  description = "Evidence-based Cloud SQL Enterprise tier selected before any production plan."
  type        = string
}

variable "cloud_run_max_instances" {
  description = "Reviewed production scaling ceiling selected before any production plan."
  type        = number

  validation {
    condition     = var.cloud_run_max_instances >= 1 && var.cloud_run_max_instances <= 20
    error_message = "cloud_run_max_instances must remain between 1 and 20 in this Phase 0 skeleton."
  }
}
