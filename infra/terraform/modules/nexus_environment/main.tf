locals {
  name_prefix     = "nexus-v2-${var.environment}"
  deletion_policy = var.deletion_protection ? "PREVENT" : "DELETE"

  labels = {
    application = "nexus-v2"
    environment = var.environment
    managed_by  = "terraform"
  }

  services = {
    web = {
      image = var.container_images.web
      port  = 8080
    }
    api = {
      image = var.container_images.api
      port  = 8080
    }
    worker = {
      image = var.container_images.worker
      port  = 8080
    }
  }
}

check "container_image_scope" {
  assert {
    condition = alltrue([
      for image in values(var.container_images) :
      strcontains(image, "/${var.project_id}/${local.name_prefix}-containers/")
    ])
    error_message = "Container images must come from this environment's project and canonical Artifact Registry repository."
  }
}
