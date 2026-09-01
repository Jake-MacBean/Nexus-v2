# Nexus environment module

This module describes one isolated Nexus v2 Google Cloud environment. Callers
must fix `environment` in their root module; it is not a switch selected with a
Terraform CLI workspace.

The module enables only the APIs used by its resources and defines:

- an environment-specific Docker Artifact Registry repository;
- private-by-default Cloud Run v2 skeletons for `web`, `api`, and `worker`;
- one runtime service account per service, with no project-wide grants;
- a zonal Cloud SQL PostgreSQL 18 Enterprise instance and Nexus database;
- one private, versioned Cloud Storage bucket;
- one empty Secret Manager container reserved for `DATABASE_URL`;
- Logging and Monitoring API enablement plus consistent resource labels.

The module creates no secret versions, SQL users/passwords, service-account
keys, public invoker bindings, deployment identity, custom network, dashboards,
alerts, or application observability. Those boundaries require later reviewed
work.
