# `@nexus-v2/kernel`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Domain-neutral primitives and value concepts that are foundational across Nexus.

## Future responsibilities

- Universally valid primitives only after they prove useful across the whole platform.
- Small invariant-free types that give later packages a common technical vocabulary.

## Explicit prohibitions

- Business objects or policies owned by a Nexus domain.
- Convenience utilities, provider adapters, persistence code, or a generic dumping ground.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: No Nexus workspace dependencies by default. Any future dependency requires architecture review.
- Must never depend on: Apps, domain packages, application orchestration, database, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/kernel`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A platform-wide identifier primitive whose meaning is independent of every domain.
- A domain-neutral clock abstraction needed consistently across Nexus.

## Future work that does not belong here

- Person, Opportunity, Invoice, Task, or any other canonical business object.
- Formatting helpers or unrelated reusable functions.
