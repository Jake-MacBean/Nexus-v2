# `@nexus-v2/workspaces`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Visual Grammar, Workspace Specification, and deterministic workspace-runtime contracts.

## Future responsibilities

- Future versioned workspace and visual specifications.
- Renderer-facing contracts for permission-safe projections and workspace patches.

## Explicit prohibitions

- Canonical domain data, business policy, or model-generated executable UI code.
- A second source of truth hidden inside saved workspace state.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and approved application projections.
- Must never depend on: Apps as implementation dependencies, database implementations, provider SDKs, or direct domain internals.
- Consumers must import through `@nexus-v2/workspaces`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future versioned Workspace Specification contract.
- A future Visual Grammar component registration contract.

## Future work that does not belong here

- A duplicate Customer or Invoice store.
- Business mutations implemented inside a React component.
