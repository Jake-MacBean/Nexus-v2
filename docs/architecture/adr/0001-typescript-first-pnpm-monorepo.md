# ADR-0001: TypeScript-first pnpm monorepo

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Developer Experience / Engineering Architecture
- Related Architecture Contracts: AC-023
- Related Foundation sections: 145 Technical Platform Architecture; 149
  Agent-Legible Engineering and Codex Development Constraint
- Related implementation evidence: [workspace definition](../../../pnpm-workspace.yaml),
  [root package and commands](../../../package.json),
  [repository operating guide](../../../AGENTS.md), and
  [architecture policy](../../../architecture/policy.mjs)

## Context

Nexus requires shared contracts, coordinated changes across application and domain
boundaries, consistent tooling, and a repository that agents can navigate and
verify without undocumented orchestration. Splitting the initial system across
repositories would add release, versioning, and coordination overhead before it
provides an operational benefit.

## Decision

Nexus v2 uses a TypeScript-first pnpm workspace monorepo. Web, API, and worker
applications coexist with shared architectural and domain packages under one
source-controlled repository. Common tooling and atomic cross-layer changes are
available, while machine-enforced dependency rules preserve ownership boundaries.

## Alternatives considered

- Multiple repositories: rejected initially because shared contract evolution and
  atomic changes would require premature release coordination.
- Polyglot service repositories: reserved for evidence-backed operational needs;
  they would weaken the current shared TypeScript contract surface.
- A framework-managed monorepo abstraction: unnecessary while pnpm workspaces and
  explicit repository scripts remain sufficient and more legible.

## Consequences

- Positive: Shared types, commands, verification, and architecture checks evolve
  together and are easier for humans and agents to discover.
- Tradeoff: Repository-wide gates can grow in cost and require disciplined package
  ownership and selective tooling.
- Operational: Toolchain and dependency pins are managed centrally, and changes
  affecting multiple layers can remain one reviewable commit.

## Constraints / guardrails

- Monorepo does not mean boundarylessness; package ownership and dependency
  direction remain enforced.
- Applications must not become alternate owners of domain logic.
- A catch-all shared package must not hide responsibility.

## Revisit triggers

- Repository scale makes verification or ownership materially unmanageable.
- A component requires independent security, release, language, or operational
  ownership that cannot be expressed cleanly inside the monorepo.
