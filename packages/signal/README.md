# `@nexus-v2/signal`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Marketing orchestration for programs, campaigns, content, audiences, distribution, performance, and learning.

## Future responsibilities

- Future marketing-domain behavior, program structure, and performance learning.
- Canonical marketing plans and campaign execution intent.

## Explicit prohibitions

- Canonical Loop identities, Axis commercial progression, or provider-specific delivery behavior.
- Direct email/social provider callbacks as business policy.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts.
- Must never depend on: Apps, other domain packages, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/signal`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future campaign lifecycle rule or audience-selection policy.
- A future marketing-performance learning projection.

## Future work that does not belong here

- The Gmail or social-network adapter that distributes content.
- A sales opportunity or canonical contact identity.
