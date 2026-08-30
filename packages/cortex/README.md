# `@nexus-v2/cortex`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Execution responsibility for tasks, projects, commitments, scheduling, and operational work.

## Future responsibilities

- Future canonical execution behavior and invariants for operational commitments.
- Public domain capabilities and projections for work execution.

## Explicit prohibitions

- Duplicate Person, Organization, Opportunity, or financial records.
- Cross-domain orchestration, adapter logic, or application entry points.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts.
- Must never depend on: Apps, other domain packages, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/cortex`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future rule governing task completion or project commitment state.
- A future execution-domain projection exposed through its public entry point.

## Future work that does not belong here

- The canonical client relationship owned by Loop.
- An invoice, marketing campaign, or Fastify route.
