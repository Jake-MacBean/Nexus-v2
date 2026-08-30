# `@nexus-v2/workflows`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Durable business-workflow execution and workflow-runtime integration boundary.

## Future responsibilities

- Future long-running execution, timers, retries, waits, approvals, and recovery.
- Translation between provider-neutral workflow meaning and a durable runtime adapter.

## Explicit prohibitions

- Canonical business truth, domain policy, or Temporal concepts embedded in domain meaning.
- A second Commands/Queries implementation.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, application, authority, audit, events, and observability.
- Must never depend on: Apps, direct database policy, AI-owned execution state, or arbitrary domain internals.
- Consumers must import through `@nexus-v2/workflows`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future durable commercial-to-cash orchestration invoking application capabilities.
- A Temporal adapter hidden behind provider-neutral workflow contracts.

## Future work that does not belong here

- An opportunity stage invariant.
- A retry loop stored only in model conversation history.
