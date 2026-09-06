# ADR-0006: Transactional PostgreSQL outbox for durable business events

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Data Architecture
- Related Architecture Contracts: AC-005, AC-006, AC-008
- Related Foundation sections: 14 Cross-Module Event Principle; 145 Technical
  Platform Architecture - Durable Workflows and Events
- Related implementation evidence: [events package scaffold](../../../packages/events/README.md),
  [database package guide](../../../packages/database/README.md),
  [repository operating guide](../../../AGENTS.md), and
  [contract registry](../contracts.registry.json). The canonical business event and
  outbox runtime is planned for Phase 1 and is not yet implemented.

## Context

A canonical state change and its business event must not diverge if a process fails
between database commit and publication. Events represent facts that other domains
may react to; they are not imperative instructions or duplicate owners of the same
business object.

## Decision

Meaningful canonical state transitions and their outbox records will be written
atomically in one PostgreSQL transaction. After commit, a worker publishes durable
events asynchronously with retry, replay, and consumer-idempotency support. One fact
is recorded once and may produce many downstream reactions.

The decision is Accepted; the repository currently contains the event boundary and
governance evidence, not a completed business-event/outbox implementation.

## Alternatives considered

- In-process EventEmitter publication: rejected because events disappear on process
  failure and cannot provide durable replay.
- Publish directly before database commit: rejected because consumers can observe a
  fact that later rolls back.
- Publish directly after commit without an outbox: rejected because failure between
  commit and publication loses the event.
- Unstructured table polling: rejected unless it implements explicit canonical
  outbox semantics, identity, status, and idempotency.

## Consequences

- Positive: Business state and event intent cannot commit independently; publication
  becomes recoverable and replayable.
- Tradeoff: Outbox storage, dispatcher behavior, deduplication, retention, and
  monitoring add implementation and operational work.
- Operational: Publication occurs asynchronously after commit, and consumers must be
  idempotent and preserve event identity.

## Constraints / guardrails

- Events describe completed or canonical facts, not downstream commands.
- Domain transactions and corresponding outbox writes are atomic.
- Replay must not duplicate consequential side effects.
- The outbox must not become an alternate business datastore.

## Revisit triggers

- PostgreSQL transaction or throughput evidence cannot support the required outbox
  workload safely.
- A replacement architecture proves equivalent atomicity, durability, replay, and
  idempotency while preserving canonical ownership.
