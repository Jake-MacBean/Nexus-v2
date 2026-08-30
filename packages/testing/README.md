# `@nexus-v2/testing`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Shared test fixtures, builders, fakes, and harness support.

## Future responsibilities

- Reusable test-only builders, deterministic clocks, fake adapters, and contract-test helpers.
- Harness support that improves verification without entering production paths.

## Explicit prohibitions

- Production business behavior, canonical fixtures treated as real data, or runtime service location.
- A generic convenience library consumed by production packages.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: any Nexus package only in explicit test or development contexts.
- Must never depend on: Production dependency graphs or deployable runtime behavior.
- Consumers must import through `@nexus-v2/testing`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future fake clock and organization-scoped test builder.
- A future provider timeout-after-success test harness.

## Future work that does not belong here

- A production repository implementation.
- Business policy shared with production code through a test shortcut.
