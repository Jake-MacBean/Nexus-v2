# `@nexus-v2/loop`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Canonical people, organizations, relationships, roles, interaction history, and relationship intelligence.

## Future responsibilities

- Future identity and relationship-domain behavior for people and organizations.
- Relationship history and intelligence grounded in canonical Loop records.

## Explicit prohibitions

- Lead/contact duplicates, finance-only organization copies, or opportunity ownership.
- Cross-domain orchestration, adapters, or UI logic.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts.
- Must never depend on: Apps, other domain packages, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/loop`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future canonical Person or Organization rule.
- A future relationship-strength projection derived from Loop history.

## Future work that does not belong here

- An Axis opportunity or Current invoice.
- A Gmail adapter or React contact screen.
