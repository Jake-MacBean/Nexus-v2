# `@nexus-v2/application`

Status: Phase 0 architecture scaffold with promotion-controlled execution orchestration.

## Purpose

The future home of canonical Commands, Queries, and cross-domain application orchestration.

## Future responsibilities

- Application use-case boundaries and orchestration that invoke domain capabilities.
- The single capability surface used later by UI, API, AI, workflows, MCP, and integrations.

## Promotion-controlled execution

`runControlledCapability` establishes one explicit application-level boundary:

```text
resolve promotion mode
  disabled -> stop
  shadow   -> propose -> record -> stop
  enabled  -> propose -> executor
```

The proposer is contractually side-effect-free. The executor is the only callback in
this abstraction allowed to represent an external effect. TypeScript cannot prove
side-effect freedom, so structure, tests, and review enforce this rule.

Shadow recording is provider-neutral. `InMemoryShadowRecorder` supports deterministic
Phase 0 tests without deciding a database, event, analytics, or external-provider
destination. A recorder failure throws and cannot fall through to the executor.

An `executed` result means only that the supplied test/application executor callback
ran. **ENABLED IS NOT AUTHORIZED.** Future Authority, permission, policy, approval,
risk, and reversibility checks remain mandatory at their proper boundary.

Shadow observations are engineering promotion evidence. They are not Business Audit,
AI Activity, Authority decisions, notifications, Needs You items, or Control Center
items.

## Explicit prohibitions

- HTTP, React, model-provider, webhook, or database-adapter behavior.
- Duplicated domain policy or direct long-running workflow state.

## Allowed dependency direction

This package depends on `@nexus-v2/kernel` for promotion-control contracts.

- May depend on: kernel, contracts, domain public entry points, authority, audit, and events.
- Must never depend on: Apps, database implementations, integrations, AI adapters, workspaces, or workflows.
- Consumers must import through `@nexus-v2/application`; deep imports into `src` or `dist` internals are prohibited.
- Cross-domain behavior must be coordinated through approved application capabilities, events, or workflows rather than arbitrary domain-to-domain imports.

Automated enforcement is implemented by the root `pnpm architecture:check` command and the policy in `architecture/policy.mjs`.

## Future work that belongs here

- A future CreateTask Command handler coordinating authorized domain behavior.
- A future GetBusinessOutlook Query composing approved projections.

## Future work that does not belong here

- A Fastify route or React hook.
- A Temporal workflow implementation or SQL query.
