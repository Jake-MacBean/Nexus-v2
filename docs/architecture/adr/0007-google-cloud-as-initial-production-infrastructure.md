# ADR-0007: Google Cloud as initial production infrastructure

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Infrastructure Architecture
- Related Architecture Contracts: AC-021, AC-023
- Related Foundation sections: 145 Technical Platform Architecture - Primary
  Infrastructure; 148 Security, Secrets, Deployment, Reliability, and Observability
- Related implementation evidence: [Terraform foundation guide](../../../infra/terraform/README.md),
  [environment module](../../../infra/terraform/modules/nexus_environment/README.md),
  and [dev identity bootstrap](../../../infra/terraform/bootstrap/github-dev/README.md).
  The application environment roots remain unapplied.

## Context

Nexus needs managed compute, relational persistence, object storage, messaging,
secrets, and identity with low initial operational burden. A deliberately small
number of deployables should run on managed infrastructure while application and
domain architecture remain portable where practical.

## Decision

Google Cloud is the initial production infrastructure home. The intended baseline
uses Cloud Run, Cloud SQL for PostgreSQL, Cloud Storage, Pub/Sub, Secret Manager,
Identity Platform, and related managed services only where justified. Terraform
provider abstractions and Nexus-owned application boundaries limit unnecessary
cloud coupling.

The provider decision is Accepted. Only the Terraform environment skeleton and the
dev GitHub OIDC/WIF control-plane bootstrap exist; no Nexus application environment
has been deployed.

## Alternatives considered

- AWS or Azure: viable platforms, but selecting multiple initial clouds would add
  operational breadth without current product evidence.
- Replit-hosted production: rejected as the canonical production direction because
  Nexus requires explicit infrastructure, isolation, and durability controls.
- Self-managed VMs or Kubernetes: rejected initially because managed services and a
  few deployables reduce operational burden.
- Premature multi-cloud: rejected because it multiplies deployment and reliability
  work before customer or regulatory evidence requires it.

## Consequences

- Positive: Managed services align with the small-deployable topology and reduce
  undifferentiated infrastructure operations.
- Tradeoff: Cloud APIs, IAM, regional behavior, and managed-service constraints
  introduce provider coupling and require cost governance.
- Operational: Dev, staging, and production must remain independently scoped, and
  services are enabled only when the relevant environment is reviewed and deployed.

## Constraints / guardrails

- GCP is infrastructure, not Nexus's architecture identity; domains must not become
  Google-specific.
- New services require actual capability, reliability, security, or cost evidence.
- Application deployment and production readiness cannot be inferred from the
  existing skeleton or WIF bootstrap.
- Kubernetes and multi-cloud are not starting requirements.

## Revisit triggers

- Customer, regulatory, geographic, reliability, cost, or acquisition constraints
  require another platform or multi-cloud posture.
- A managed GCP service materially compromises Nexus ownership boundaries or
  portability.
