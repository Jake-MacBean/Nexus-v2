# ADR-0003: PostgreSQL as canonical persistence

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Data Architecture
- Related Architecture Contracts: AC-001, AC-002, AC-006
- Related Foundation sections: 145 Technical Platform Architecture - Canonical
  Data and Database Access
- Related implementation evidence: [database package guide](../../../packages/database/README.md),
  [local infrastructure guide](../../../infra/README.md), and
  [Terraform foundation](../../../infra/terraform/README.md)

## Context

Canonical business truth requires relational integrity, explicit organization
ownership, strong transactions, reviewed migrations, and an atomic foundation for
durable events. Nexus also benefits from PostgreSQL full-text and vector extension
options without making either retrieval mechanism canonical truth.

## Decision

PostgreSQL is the canonical datastore for Nexus business state. Local development
uses PostgreSQL; intended production uses Cloud SQL for PostgreSQL. Drizzle is the
initial TypeScript mapping and migration layer, with explicit, version-controlled
migrations and transactional access close to SQL.

## Alternatives considered

- A document database as the canonical store: rejected because Nexus depends on
  relationships, constraints, and multi-record transaction semantics.
- A database per domain: rejected initially because code ownership does not require
  distributed data ownership or cross-database transactions.
- A proprietary serverless database as canonical truth: rejected because it would
  increase platform coupling without demonstrated need.

## Consequences

- Positive: Relational integrity, transactions, migration discipline, outbox
  compatibility, and mature query capabilities share one canonical foundation.
- Tradeoff: Schema and query evolution require coordination and disciplined tenancy
  enforcement.
- Operational: Production changes use reviewed migrations; local destructive
  tooling remains strictly loopback-guarded.

## Constraints / guardrails

- Domain ownership does not imply database-per-domain.
- Database mappings and migrations must not become owners of domain policy.
- PostgreSQL full-text and pgvector are potential retrieval mechanisms, not claims
  of current implementation or alternate sources of truth.
- Opportunistic schema push is prohibited for shared and production databases.

## Revisit triggers

- Demonstrated scale, availability, regulatory, or workload evidence requires a
  specialized store behind a defined ownership boundary.
- Drizzle can no longer support explicit migrations and transactions safely.
