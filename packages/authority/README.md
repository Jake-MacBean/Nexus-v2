# `@nexus-v2/authority`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

The boundary for future authority evaluation and policy-enforcement capabilities.

## Future responsibilities

- Authority decision contracts, policy evaluation services, and enforcement evidence when implemented.
- Programmatic enforcement used consistently by all consequential application entry points.

## Explicit prohibitions

- The Authority Engine implementation during this scaffold packet.
- Authentication UI, provider guardrails, or business operations themselves.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and audit.
- Must never depend on: Apps, provider adapters, direct database implementations, or domain feature implementations.
- Consumers must import through `@nexus-v2/authority`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is intentionally deferred to P0.02-T02.

## Future work that belongs here

- A future evaluation of actor, action, scope, risk, and reversibility.
- A future authority decision result consumed by an application Command.

## Future work that does not belong here

- Password verification or login screens.
- Sending an email or mutating an invoice.
