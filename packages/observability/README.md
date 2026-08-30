# `@nexus-v2/observability`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Technical logs, metrics, traces, correlation, and operational telemetry.

## Future responsibilities

- Future technical instrumentation contracts and provider adapters.
- Correlation and health telemetry for services and workers.

## Explicit prohibitions

- Business audit, authority provenance, canonical events, or user-facing activity history.
- Domain decisions inferred from technical logs.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel only, unless an architecture contract explicitly expands the boundary.
- Must never depend on: Apps, domain packages, audit, application behavior, or provider business semantics.
- Consumers must import through `@nexus-v2/observability`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future trace context and metrics port.
- A future structured technical logger adapter.

## Future work that does not belong here

- The legal record of who approved a payment.
- A business recommendation or customer interaction history.
