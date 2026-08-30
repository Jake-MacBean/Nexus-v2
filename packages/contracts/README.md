# `@nexus-v2/contracts`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Stable schemas and contracts shared across explicit architectural boundaries.

## Future responsibilities

- Versioned boundary data shapes and compatibility contracts.
- Public schemas that multiple adapters or packages must exchange without sharing implementation.

## Explicit prohibitions

- Business use-case implementations, persistence behavior, or provider orchestration.
- A mirror of every internal domain type or a catch-all shared package.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: @nexus-v2/kernel.
- Must never depend on: Apps, database implementations, integrations, AI providers, or domain implementation internals.
- Consumers must import through `@nexus-v2/contracts`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A versioned public request or projection schema used across an approved boundary.
- Compatibility metadata for a stable public contract.

## Future work that does not belong here

- The handler that executes a request.
- A provider-specific payload promoted into canonical Nexus meaning.
