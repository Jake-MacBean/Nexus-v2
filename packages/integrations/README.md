# `@nexus-v2/integrations`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

External provider adapters and integration-facing contracts.

## Future responsibilities

- Future API, webhook, file, and MCP provider adapters.
- Translation between external provider semantics and canonical Nexus application capabilities.

## Explicit prohibitions

- Canonical business policy, duplicate provider-shaped business objects, or direct unauthorized mutation.
- Provider details leaking into domain meaning.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, application, authority, audit, events, and observability.
- Must never depend on: Apps, direct domain implementation internals, workspaces, or AI orchestration.
- Consumers must import through `@nexus-v2/integrations`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future Gmail adapter invoking a canonical communication Command.
- A future accounting-provider mapper with reconciliation metadata.

## Future work that does not belong here

- The canonical definition of an Invoice.
- A provider webhook that implements business policy in its callback.
