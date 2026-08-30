# `@nexus-v2/axis`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Commercial growth through opportunities, scope, proposals, contracts, and progression to Contract-Won.

## Future responsibilities

- Future commercial-state behavior and invariants.
- Opportunity, proposal, scope, and contract progression within the Axis responsibility boundary.

## Explicit prohibitions

- Duplicate Loop identities, Cortex project execution, or Current bookkeeping facts.
- Adapter, persistence, or cross-domain workflow implementation.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts.
- Must never depend on: Apps, other domain packages, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/axis`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future opportunity-stage invariant.
- A future Contract-Won domain fact.

## Future work that does not belong here

- The delivery project created after a win.
- The invoice issued for contracted work or the API route that advances a stage.
