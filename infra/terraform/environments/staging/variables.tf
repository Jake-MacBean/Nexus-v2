variable "project_id" {
  description = "Existing Google Cloud project dedicated to Nexus staging; it must contain staging."
  type        = string

  validation {
    condition = (
      can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id)) &&
      strcontains(lower(var.project_id), "staging")
    )
    error_message = "The staging project_id must be a valid Google Cloud project ID containing staging."
  }
}

variable "region" {
  description = "Google Cloud region for Nexus staging resources."
  type        = string
  default     = "us-east1"
}

variable "bucket_location" {
  description = "Cloud Storage location for staging objects."
  type        = string
  default     = "US-EAST1"
}

variable "container_images" {
  description = "Immutable staging image URIs for web, API, and worker."
  type = object({
    web    = string
    api    = string
    worker = string
  })
}

variable "cloud_sql_tier" {
  description = "Low-cost Cloud SQL Enterprise tier for staging."
  type        = string
  default     = "db-f1-micro"
}

variable "cloud_run_max_instances" {
  description = "Maximum instances per staging Cloud Run service."
  type        = number
  default     = 3
}
