# `@nexus-v2/events`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Canonical event contracts and the future durable publishing boundary.

## Future responsibilities

- Canonical business-event envelopes and durable publication abstractions.
- Event metadata needed for transactional outbox and consumer idempotency.

## Explicit prohibitions

- Domain policy, an in-memory-only consequential event system, or workflow state.
- Provider-specific messaging details leaking into event meaning.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, audit, and observability.
- Must never depend on: Apps, direct domain-to-domain orchestration, AI, or integration-provider implementations.
- Consumers must import through `@nexus-v2/events`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future canonical ContractWon event contract.
- A future publisher port backed by a transactional outbox adapter.

## Future work that does not belong here

- The domain rule that wins a contract.
- A Temporal workflow definition or Gmail webhook payload.
