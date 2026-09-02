# `@nexus-v2/kernel`

Status: Phase 0 architecture scaffold with domain-neutral promotion-control contracts.

## Purpose

Domain-neutral primitives and value concepts that are foundational across Nexus.

## Future responsibilities

- Universally valid primitives only after they prove useful across the whole platform.
- Small invariant-free types that give later packages a common technical vocabulary.

## Promotion-control ownership

Kernel owns the dependency-free vocabulary used to decide whether a capability is
`disabled`, `shadow`, or `enabled`:

- typed flag definitions and stable lowercase dot/hyphen-separated keys;
- the `local`, `test`, `staging`, and `production` environment vocabulary;
- an opaque, optional organization scope used only for flag resolution;
- the provider-neutral `PromotionModeSource` contract;
- deterministic static overrides and their resolution precedence.

Definitions without an explicit default use `disabled`. Resolution precedence is:

1. exact organization plus environment override;
2. environment override;
3. the flag definition default.

The static source is an in-process Phase 0 test/local adapter. It is not a persistence
decision or a remote feature-management integration.

The opaque `PromotionOrganizationId` does not define Organization identity, tenancy,
permission, or authorization. Phase 1 must connect or replace it with the canonical
Organization identifier contract.

**ENABLED IS NOT AUTHORIZED.** A promotion result only controls whether code is
eligible to continue through its normal execution path.

## Explicit prohibitions

- Business objects or policies owned by a Nexus domain.
- Convenience utilities, provider adapters, persistence code, or a generic dumping ground.

## Allowed dependency direction

This package declares no runtime workspace dependencies.

- May depend on: No Nexus workspace dependencies by default. Any future dependency requires architecture review.
- Must never depend on: Apps, domain packages, application orchestration, database, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/kernel`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A platform-wide identifier primitive whose meaning is independent of every domain.
- A domain-neutral clock abstraction needed consistently across Nexus.
- Provider-neutral promotion primitives that remain independent of business domains.

## Future work that does not belong here

- Person, Opportunity, Invoice, Task, or any other canonical business object.
- Formatting helpers or unrelated reusable functions.
