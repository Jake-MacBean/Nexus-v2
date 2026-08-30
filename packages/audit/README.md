# `@nexus-v2/audit`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Business accountability and reconstructable decision/action evidence.

## Future responsibilities

- Future append-only business audit contracts and persistence boundary.
- Actor, initiator, authority provenance, target, result, and causal-reference evidence.

## Explicit prohibitions

- Technical telemetry, provider traces, editable activity feeds, or private chain-of-thought.
- Domain behavior or authorization decisions.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel and contracts.
- Must never depend on: Apps, observability implementation, provider SDKs, or domain feature internals.
- Consumers must import through `@nexus-v2/audit`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future immutable record explaining who authorized a consequential action.
- A future audit writer port used by application capabilities.

## Future work that does not belong here

- HTTP latency metrics or model token traces.
- A mutable user-facing notification feed.
