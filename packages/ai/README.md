# `@nexus-v2/ai`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Model Gateway, Alex runtime adapters, reasoning-provider boundaries, and future AI tool adapters.

## Future responsibilities

- Future provider-neutral reasoning requests, model routing, tool adaptation, and Alex runtime integration.
- AI evaluation-facing adapters that call canonical application capabilities.

## Explicit prohibitions

- Business mutations inside tools, provider-specific business logic, or canonical business truth.
- Direct replacement of Commands, Queries, authority, workflows, or memory ownership.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, application, authority, audit, memory, and observability.
- Must never depend on: Apps, direct database implementations, domain internals, or integration-provider business logic.
- Consumers must import through `@nexus-v2/ai`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future Model Gateway adapter selecting an approved reasoning profile.
- A future AI tool wrapper calling an existing application Command.

## Future work that does not belong here

- An OpenAI function that is the only implementation of creating a task.
- A model callback that writes directly to a business table.
