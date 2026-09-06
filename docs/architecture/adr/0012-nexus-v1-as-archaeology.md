# ADR-0012: Nexus v1 is archaeology, not the v2 codebase

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Platform Architecture
- Related Architecture Contracts: AC-022, AC-023
- Related Foundation sections: 1 Purpose of This Document; 150 V1 to V2 Migration
  Architecture
- Related implementation evidence: [repository operating guide](../../../AGENTS.md),
  [repository status and boundaries](../../../README.md), and
  [contract registry](../contracts.registry.json). V1 migration pipelines are future
  work and are not implemented in Phase 0.

## Context

Nexus v1 contains valuable capabilities and business history, but its accumulated
duplicate models, workflow paths, tenancy assumptions, in-process events, polling,
and AI state are not a safe architecture baseline for v2.

## Decision

Nexus v2 is a clean technical rebuild. Nexus v1 is preserved as product archaeology
and a controlled migration source. Behavior and data are classified as preserve,
rewrite, migrate, archive, or remove. Code reuse is exceptional and must pass v2
ownership, tenancy, Authority, event, workflow, security, and test gates.

The governing principle is: **Copy ideas, not code, unless code earns its way.**

## Alternatives considered

- Fork v1 and refactor in place: rejected because legacy boundaries and competing
  implementations would remain the default architecture.
- Keep the v1 schema as a permanent compatibility layer: rejected because v2 would
  inherit legacy identity and ownership constraints indefinitely.
- Wholesale code or data copying: rejected because presence in v1 does not prove
  canonical ownership, safety, or continued product value.

## Consequences

- Positive: V2 can establish coherent canonical ownership while preserving valuable
  outcomes and migration provenance deliberately.
- Tradeoff: Useful capabilities must often be rewritten, and data migration requires
  explicit mapping, reconciliation, and validation effort.
- Operational: V1 remains frozen archaeology; migration follows repeatable extract,
  stage, transform, validate, and load steps with source identifiers retained.

## Constraints / guardrails

- V1 code is never copied merely for speed or apparent feature parity.
- Migration preserves provenance, old-to-new identity mapping, reconciliation, and
  repeatability.
- V2 must not point at v1 tables indefinitely as canonical live state.
- Continued v1 maintenance must not become a second source of v2 architecture.

## Revisit triggers

- A specific v1 component demonstrably satisfies every v2 reuse gate and has a lower
  risk than rewriting it.
- Migration evidence requires a revised classification or sequencing decision,
  recorded explicitly without making v1 the architecture template.
