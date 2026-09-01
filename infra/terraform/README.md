# Nexus v2 Terraform foundation

This directory is the canonical Infrastructure-as-Code skeleton for Nexus v2.
It describes Google Cloud resources but has not been applied. P0.08-T01 creates
no project, state bucket, image, credential, or billable cloud resource.

## Toolchain

- Terraform CLI is pinned exactly to `1.16.0`.
- The stable `hashicorp/google` provider is pinned exactly to `8.1.0`.
- `google-beta` is not used.
- Every root commits provider locks for `windows_amd64` and `linux_amd64`.

Terraform 1.16.0 remains the current stable CLI. Google provider 8.1.0 became
the current stable release after this packet was drafted. Its 8.0 upgrade notes
and 8.1 release notes do not remove or incompatibly change the resources used by
this new foundation, so the new code adopts 8.1.0 without migration baggage.

## Layout and ownership

```text
infra/terraform/
├── modules/nexus_environment/    reusable one-environment foundation
└── environments/
    ├── dev/                      fixed development root and state prefix
    ├── staging/                  fixed staging root and state prefix
    └── prod/                     fixed future-production root and protections
```

Each environment directory is an independent Terraform root. Directory choice,
not `terraform.workspace` or an `environment` input, selects the environment.
Each root hard-codes its identity when calling `nexus_environment`, requires a
project ID containing that identity, and generates all canonical names from the
fixed identity. Copying a dev variable file to staging or prod therefore fails
project and image-scope checks rather than silently targeting dev resources.

## State architecture

Every root declares the GCS backend with its own immutable default prefix:

| Root      | Backend prefix     | Required bucket                    |
| --------- | ------------------ | ---------------------------------- |
| `dev`     | `nexus-v2/dev`     | dedicated development state bucket |
| `staging` | `nexus-v2/staging` | dedicated staging state bucket     |
| `prod`    | `nexus-v2/prod`    | dedicated production state bucket  |

Bucket names are deliberately absent because no state buckets exist in this
packet. Create and protect them through a separately reviewed bootstrap process;
do not manage a root's backend bucket from that same root. Each environment must
use a distinct bucket as well as its distinct prefix.

Terraform state can contain sensitive infrastructure metadata. State belongs in
protected, versioned, access-controlled GCS; it must never be committed, printed
as routine diagnostics, manually edited, or shared across environments. Future
deployment automation owns narrowly scoped state access.

The local ignore policy excludes `.terraform`, state, plans, overrides, crash
logs, and real `.tfvars`, while retaining `.terraform.lock.hcl` and
`terraform.tfvars.example`.

## Foundation resources

One module instance creates names and labels containing `nexus-v2` and its fixed
environment identity.

### Required APIs

- Artifact Registry
- Identity and Access Management
- Cloud Logging
- Cloud Monitoring
- Cloud Run
- Secret Manager
- Service Usage
- Cloud SQL Admin
- Cloud Storage

No AI, Gmail, Calendar, Vertex AI, networking, build, or other speculative API
is enabled.

### Artifact Registry

Each environment has one regional Docker repository named
`nexus-v2-<environment>-containers`. It is the required source for all three
immutable image-digest variables. This packet publishes no image and grants no
CI access. P0.08-T02 may add a separate workload-identity deployment principal.

### Cloud Run

Cloud Run v2 service skeletons exist for `web`, `api`, and `worker`. Each has:

- its own runtime service account;
- an explicit environment-specific image digest;
- zero minimum instances and a small root-controlled maximum;
- one CPU and 512 MiB memory;
- consistent non-secret labels;
- no application or secret environment variables;
- no `allUsers` or other invoker IAM binding.

The services use normal Cloud Run ingress but remain authenticated by IAM. A
later architecture decision must deliberately establish any public web/API
surface. The worker is only a service skeleton; no queue, job, or Temporal
connectivity is invented here.

### Cloud SQL

The foundation uses PostgreSQL 18 (`POSTGRES_18`) with Cloud SQL Enterprise,
single-zone availability, 10 GiB SSD storage with a 50 GiB autoresize ceiling,
and a root-selected tier. Dev and staging default to the supported shared-core
`db-f1-micro` tier. This is intentionally low-cost and is not a production sizing
claim. Production has no committed tier default and requires explicit review.

The instance receives a public IPv4 address solely to avoid prematurely adding
a VPC, private-service connection, or serverless connector. It has no authorized
network. `connector_enforcement = "REQUIRED"` and trusted-client-certificate TLS
require Cloud SQL Auth Proxy/Connector access. Later runtime access must use IAM
and a reviewed `roles/cloudsql.client` grant; this packet adds neither the grant
nor a database connection to application containers.

Each environment gets its own instance and database name. No SQL user or
password is created, so Terraform state contains no generated database secret.

### Cloud Storage

One deterministic bucket named from project plus environment is reserved for
future documents and objects. Uniform bucket-level access, enforced public
access prevention, versioning, and environment labels are enabled. No object or
anonymous IAM binding exists. Retention, legal hold, and lifecycle policy await
actual product and legal requirements.

### Secret Manager and IAM

Each environment reserves exactly one Secret Manager container for future
`DATABASE_URL` material. There is no `google_secret_manager_secret_version`,
payload, placeholder value, or Terraform-managed credential.

The three runtime service accounts have no project-wide roles. In particular,
there are no Owner, Editor, key, deployment, secret-access, storage-access, or
Cloud SQL grants. Resource access will be added narrowly when a deployed workload
requires it. Runtime identities remain separate from P0.08-T02's future GitHub
deployment identity.

### Observability boundary

Cloud Logging and Cloud Monitoring APIs plus consistent platform labels form the
infrastructure baseline. Cloud Run and Cloud SQL can emit platform telemetry
after deployment. Dashboards, SLOs, alerts, correlation, and OpenTelemetry are
intentionally deferred to P0.09.

## Required planning values

All roots require:

- `project_id`: an existing, dedicated project whose ID contains the root name;
- `container_images`: immutable web/API/worker image digests from that root's
  canonical Artifact Registry repository.

Dev and staging provide reviewable defaults for `region`, `bucket_location`,
`db-f1-micro`, and low Cloud Run ceilings. Production deliberately requires
`region`, `bucket_location`, `cloud_sql_tier`, and
`cloud_run_max_instances`; production sizing and location are not decided.

Copy `terraform.tfvars.example` to an ignored `terraform.tfvars` only after
replacing every placeholder. Terraform variables must never contain secret
payloads. Marking a variable sensitive would hide display but would not keep it
out of state.

## Credential-free validation

From the repository root, using the pinned Terraform CLI:

```text
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/environments/dev init -backend=false
terraform -chdir=infra/terraform/environments/dev validate
terraform -chdir=infra/terraform/environments/staging init -backend=false
terraform -chdir=infra/terraform/environments/staging validate
terraform -chdir=infra/terraform/environments/prod init -backend=false
terraform -chdir=infra/terraform/environments/prod validate
```

These commands download only the locked provider and require no Google Cloud
credentials. They do not produce a plan or contact a project.

## Future safe plan procedure

Planning requires an existing environment project with billing, a separately
protected environment state bucket, reviewed permissions, populated non-secret
variables, and already-published image digests. An authorized operator will use
Application Default Credentials or P0.08-T02's future short-lived workload
identity; credentials are never stored here.

For development, replace the placeholders in angle brackets and run:

```text
terraform -chdir=infra/terraform/environments/dev init -reconfigure -backend-config="bucket=<DEV_STATE_BUCKET>"
terraform -chdir=infra/terraform/environments/dev plan -var-file=terraform.tfvars -out=nexus-v2-dev.tfplan
terraform -chdir=infra/terraform/environments/dev show nexus-v2-dev.tfplan
```

Use the corresponding staging or prod root and its own state bucket and plan
filename. Before approval, a human reviewer must confirm the intended project
and environment, creates and destroys, IAM changes, Cloud Run exposure, Cloud
SQL edition/tier/networking/protection, Secret Manager changes, and every cost
center. Apply only the exact reviewed saved plan:

```text
terraform -chdir=infra/terraform/environments/dev apply nexus-v2-dev.tfplan
```

Do not use `-auto-approve` as the normal path. No init against remote state,
plan, or apply was executed by P0.08-T01.

## Protection and cost posture

Dev and staging keep Cloud Run at zero minimum instances, use low maximums and
`db-f1-micro`, disable database backups/PITR, and permit foundation teardown.
Prod hard-codes Cloud Run, Cloud SQL API, bucket-content, and database backup
protections on, while requiring explicit sizing and location inputs. This is
structural safety, not production readiness.

Potential billable resources on a future apply include Cloud SQL and its storage
and backups, Cloud Run execution, Artifact Registry storage/egress, Cloud Storage
capacity/operations/versioning, Secret Manager operations, and monitoring/log
ingestion. No HA, replicas, minimum Cloud Run instances, VPC connector, NAT,
load balancer, Kubernetes, Redis, or speculative data/AI service is present.

P0.08-T02 is the next infrastructure packet. It owns GitHub-to-Google workload
identity and deployment access; this foundation contains no OIDC, federation,
service-account key, GitHub secret, or deployment workflow.
