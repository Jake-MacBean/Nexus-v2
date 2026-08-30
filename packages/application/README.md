# `@nexus-v2/application`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

The future home of canonical Commands, Queries, and cross-domain application orchestration.

## Future responsibilities

- Application use-case boundaries and orchestration that invoke domain capabilities.
- The single capability surface used later by UI, API, AI, workflows, MCP, and integrations.

## Explicit prohibitions

- HTTP, React, model-provider, webhook, or database-adapter behavior.
- Duplicated domain policy or direct long-running workflow state.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, domain public entry points, authority, audit, and events.
- Must never depend on: Apps, database implementations, integrations, AI adapters, workspaces, or workflows.
- Consumers must import through `@nexus-v2/application`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future CreateTask Command handler coordinating authorized domain behavior.
- A future GetBusinessOutlook Query composing approved projections.

## Future work that does not belong here

- A Fastify route or React hook.
- A Temporal workflow implementation or SQL query.
