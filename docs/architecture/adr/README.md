# Nexus v2 Architecture Decision Records

Architecture Decision Records (ADRs) explain durable implementation decisions,
their context, considered alternatives, consequences, guardrails, and revisit
triggers. They make important architecture discoverable without relying on chat
history or human memory.

> **ADR != Foundation revision.** The Nexus v2 Foundation and Architecture
> Contracts remain controlling. An ADR documents an implementation decision made
> within those constraints; it cannot silently revise them. A conflict requires
> stopping work and explicitly reviewing the controlling source.

ADRs complement rather than replace the Foundation, Architecture Contracts,
Build Plan, package documentation, code, tests, and evaluations.

## Status vocabulary

- **Proposed** - under review and not yet binding.
- **Accepted** - approved and binding for implementation until superseded or
  deprecated.
- **Superseded** - replaced by a newer ADR that links back to this record.
- **Deprecated** - no longer recommended or applicable, without a direct
  replacement.

The baseline ADRs are Accepted because they record decisions already established
by Foundation v1.0 and the repository. Accepted describes the decision, not the
completion of every planned runtime capability.

## Numbering, filenames, and history

ADRs use zero-padded, contiguous IDs and lowercase kebab-case filenames:
`XXXX-short-title.md`. IDs are permanent and never reused. The next proposal uses
the next available number and begins as Proposed unless it records an already
approved controlling decision.

Once Accepted, an ADR must not be silently rewritten to change its meaning. Typo
and link repairs are acceptable. A material decision change requires a new ADR,
the prior ADR marked Superseded, and explicit reciprocal links. Superseded and
Deprecated records remain in the index and repository; history is never deleted.

## Baseline index

| ID                                                                    | Title                                                           | Status   | Primary architecture area   | Related ACs            |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | --------------------------- | ---------------------- |
| [ADR-0001](0001-typescript-first-pnpm-monorepo.md)                    | TypeScript-first pnpm monorepo                                  | Accepted | Developer Experience        | AC-023                 |
| [ADR-0002](0002-modular-monolith-before-microservices.md)             | Modular monolith before microservices                           | Accepted | Application Architecture    | AC-002, AC-023         |
| [ADR-0003](0003-postgresql-as-canonical-persistence.md)               | PostgreSQL as canonical persistence                             | Accepted | Data Architecture           | AC-001, AC-002, AC-006 |
| [ADR-0004](0004-commands-and-queries-capability-boundary.md)          | Commands and Queries as the canonical capability boundary       | Accepted | Application Architecture    | AC-003, AC-009         |
| [ADR-0005](0005-temporal-for-durable-workflow-execution.md)           | Temporal for durable workflow execution                         | Accepted | Application Architecture    | AC-007, AC-008         |
| [ADR-0006](0006-transactional-postgres-outbox.md)                     | Transactional PostgreSQL outbox for durable business events     | Accepted | Data Architecture           | AC-005, AC-006, AC-008 |
| [ADR-0007](0007-google-cloud-as-initial-production-infrastructure.md) | Google Cloud as initial production infrastructure               | Accepted | Infrastructure Architecture | AC-021, AC-023         |
| [ADR-0008](0008-terraform-for-infrastructure-as-code.md)              | Terraform for infrastructure as code                            | Accepted | Infrastructure Architecture | AC-021, AC-023         |
| [ADR-0009](0009-keyless-github-to-gcp-deployment-identity.md)         | Keyless GitHub-to-GCP deployment identity                       | Accepted | Security Architecture       | AC-021, AC-023         |
| [ADR-0010](0010-provider-neutral-opentelemetry-observability.md)      | Provider-neutral observability with OpenTelemetry compatibility | Accepted | Platform Architecture       | AC-020, AC-021         |
| [ADR-0011](0011-promotion-control-shadow-mode-authority.md)           | Promotion control and Shadow Mode are separate from Authority   | Accepted | Application Architecture    | AC-004, AC-019         |
| [ADR-0012](0012-nexus-v1-as-archaeology.md)                           | Nexus v1 is archaeology, not the v2 codebase                    | Accepted | Platform Architecture       | AC-022, AC-023         |

## Proposing or changing a decision

1. Confirm the decision is not already controlled by the Foundation or an
   Architecture Contract. An ADR cannot override either source.
2. Copy the template below into the next sequential filename and use architectural
   ownership rather than personal authorship.
3. Link real repository evidence and label unimplemented runtime work honestly.
4. Review the decision, alternatives, consequences, guardrails, and affected ACs.
5. Update this index. For supersession, update both the new and old records without
   deleting history.
6. Run repository verification and validate all local documentation links.

## Template

```markdown
# ADR-XXXX: Title

- Status: Proposed
- Date: YYYY-MM-DD
- Decision owners: Architecture area
- Related Architecture Contracts: AC-XXX
- Related Foundation sections: Section number and title
- Related implementation evidence: Repository links, with planned work labeled

## Context

What problem or decision pressure exists?

## Decision

What is chosen? Distinguish accepted direction from implementation status.

## Alternatives considered

- Realistic alternative and concise rationale.

## Consequences

- Positive: Benefit.
- Tradeoff: Cost or limitation.
- Operational: Ongoing implication.

## Constraints / guardrails

- Rules future work must not violate.

## Revisit triggers

- Evidence or conditions that justify a new superseding ADR.
```
