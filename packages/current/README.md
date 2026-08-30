# `@nexus-v2/current`

Status: Phase 0 architecture scaffold. The public entry point intentionally exports package identity only.

## Purpose

Financial operations and bookkeeping across banking, AR/AP, invoices, payments, expenses, budgets, cash flow, and project economics.

## Future responsibilities

- Future canonical financial records, accounting behavior, and financial invariants.
- Financial projections grounded in canonical Current facts.

## Explicit prohibitions

- Duplicate Loop organizations, Axis contracts, or Cortex projects.
- Provider banking adapters, UI calculations, or cross-domain orchestration.

## Allowed dependency direction

This scaffold currently declares no runtime workspace dependencies.

- May depend on: kernel, contracts, and canonical event contracts.
- Must never depend on: Apps, other domain packages, database implementations, integrations, AI, or workspaces.
- Consumers must import through `@nexus-v2/current`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future invoice-balance invariant or payment allocation rule.
- A future cash-flow projection derived from canonical financial records.

## Future work that does not belong here

- A bank-provider API client.
- The customer identity, commercial contract, or project execution record.
