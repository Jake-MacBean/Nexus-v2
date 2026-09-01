variable "environment" {
  description = "Fixed Nexus environment identity established by the calling root module."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of dev, staging, or prod."
  }
}

variable "project_id" {
  description = "Existing Google Cloud project dedicated to this Nexus environment."
  type        = string

  validation {
    condition = (
      can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id)) &&
      strcontains(lower(var.project_id), var.environment)
    )
    error_message = "project_id must be a valid Google Cloud project ID containing the fixed environment name."
  }
}

variable "region" {
  description = "Google Cloud region for regional Nexus resources."
  type        = string

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.region))
    error_message = "region must be a Google Cloud region such as us-east1."
  }
}

variable "bucket_location" {
  description = "Cloud Storage location for the environment document bucket."
  type        = string

  validation {
    condition     = length(trimspace(var.bucket_location)) > 0
    error_message = "bucket_location must not be empty."
  }
}

variable "container_images" {
  description = "Immutable container image URIs for the web, API, and worker service skeletons."
  type = object({
    web    = string
    api    = string
    worker = string
  })

  validation {
    condition = alltrue([
      for image in values(var.container_images) :
      can(regex("@sha256:[0-9a-f]{64}$", image))
    ])
    error_message = "Every container image must use an immutable sha256 digest."
  }
}

variable "cloud_sql_tier" {
  description = "Reviewed Cloud SQL Enterprise tier for this environment."
  type        = string

  validation {
    condition     = startswith(var.cloud_sql_tier, "db-")
    error_message = "cloud_sql_tier must be a Cloud SQL tier beginning with db-."
  }
}

variable "cloud_run_max_instances" {
  description = "Maximum instances for each Phase 0 Cloud Run service."
  type        = number

  validation {
    condition     = var.cloud_run_max_instances >= 1 && var.cloud_run_max_instances <= 20
    error_message = "cloud_run_max_instances must be between 1 and 20 for this Phase 0 foundation."
  }
}

variable "deletion_protection" {
  description = "Protect long-lived environment resources against accidental deletion."
  type        = bool
}

variable "enable_database_backups" {
  description = "Enable Cloud SQL backups and point-in-time recovery."
  type        = bool
}
