# ADR-0011: Promotion control and Shadow Mode are separate from Authority

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Application Architecture
- Related Architecture Contracts: AC-004, AC-019
- Related Foundation sections: 148 Security, Secrets, Deployment, Reliability,
  and Observability - Observability and staged rollout
- Related implementation evidence: [promotion-control guide](../../promotion-control.md),
  [kernel contracts](../../../packages/kernel/README.md),
  [application execution boundary](../../../packages/application/README.md), and
  [repository operating guide](../../../AGENTS.md)

## Context

Risky capabilities and autonomous behaviors need staged evaluation without conflating
rollout eligibility with permission. A boolean flag cannot represent safe proposal-
only evaluation, and a feature flag cannot grant user or organization authority.

## Decision

Promotion control has three modes: `disabled`, `shadow`, and `enabled`. It is
fail-closed, organization-aware, and environment-aware. Shadow Mode may compute and
record a proposal but cannot invoke the side-effect executor. Enabled means eligible
to continue; it never means authorized. Consequential behavior must still pass the
future central Authority boundary.

## Alternatives considered

- Boolean feature flags only: rejected because they cannot represent proposal-only
  evaluation cleanly.
- Hidden experiments with no explicit mode contract: rejected because behavior and
  evidence would be difficult to review or reconstruct.
- Using feature flags as permission or autonomy controls: rejected because rollout
  state cannot substitute for authenticated authority and policy.

## Consequences

- Positive: New behavior can be evaluated safely before execution, with an explicit
  boundary preventing Shadow side effects.
- Tradeoff: Every promoted capability needs mode resolution, proposal evidence, and a
  separated executor path.
- Operational: Missing or invalid configuration resolves closed, and promotion can be
  scoped by organization and environment without bypassing authorization.

## Constraints / guardrails

- `enabled != authorized`.
- Shadow Mode must never cross the side-effect executor boundary.
- Promotion mode must not grant permissions, delegated authority, or autonomy.
- Flag evaluation must not become business-policy ownership.

## Revisit triggers

- Production rollout evidence requires additional explicit modes or approval stages.
- The central Authority implementation reveals a necessary interface change while
  preserving strict separation between eligibility and authorization.
