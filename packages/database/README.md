# `@nexus-v2/database`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Persistence implementations, migrations, and database adapters for approved ports.

## Future responsibilities

- Future database connection, transaction, migration, and repository-adapter implementation.
- Mapping between persistence representation and canonical public domain/application ports.

## Explicit prohibitions

- Domain policy, canonical identity decisions, or application use-case orchestration.
- Business rules embedded in SQL access or migration shortcuts.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, domain public entry points, and observability.
- Must never depend on: Apps, AI, integrations, workspaces, or arbitrary domain internals.
- Consumers must import through `@nexus-v2/database`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A PostgreSQL repository implementing a domain-owned persistence port.
- A repeatable Drizzle migration and transaction adapter.

## Future work that does not belong here

- Rules deciding when an opportunity advances.
- A second database-shaped definition of Person or Organization.
