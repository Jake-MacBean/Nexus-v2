resource "google_cloud_run_v2_service" "service" {
  for_each = local.services

  project              = var.project_id
  name                 = "${local.name_prefix}-${each.key}"
  location             = var.region
  deletion_protection  = var.deletion_protection
  deletion_policy      = local.deletion_policy
  invoker_iam_disabled = false
  labels               = local.labels

  template {
    service_account                  = google_service_account.runtime[each.key].email
    timeout                          = "300s"
    max_instance_request_concurrency = 20

    scaling {
      min_instance_count = 0
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = each.value.image

      ports {
        container_port = each.value.port
      }

      resources {
        cpu_idle = true
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.required["run.googleapis.com"]]
}

# No invoker IAM binding is created. Services remain authenticated by default;
# public exposure, if ever required, needs a separate reviewed decision.
