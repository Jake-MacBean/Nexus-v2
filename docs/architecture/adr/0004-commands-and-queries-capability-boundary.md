# ADR-0004: Commands and Queries as the canonical capability boundary

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Application Architecture
- Related Architecture Contracts: AC-003, AC-009
- Related Foundation sections: 145 Technical Platform Architecture; 146 Alex
  Runtime, Context Engine, Model Gateway, and Capability Architecture
- Related implementation evidence: [application package scaffold](../../../packages/application/README.md),
  [AI package boundary](../../../packages/ai/README.md),
  [repository operating guide](../../../AGENTS.md), and
  [contract registry](../contracts.registry.json). Business Commands and Queries
  are planned for Phase 1 and are not yet implemented.

## Context

UI, Alex, workflows, MCP, integrations, and external clients all need to request
business behavior. Independent implementations at each entry point would duplicate
rules and allow authority, event, audit, and validation behavior to diverge. AI
tools in particular must not become an alternate business layer.

## Decision

Nexus-owned Commands and Queries are the canonical application capability
boundary. Every native or external adapter invokes the same capabilities. Domain
rules, Authority enforcement, state mutation, durable events, workflow activation,
and audit occur below UI and AI adapters and remain deterministically testable.

The decision is Accepted; substantive business Commands and Queries remain future
Phase 1 implementation.

## Alternatives considered

- Business logic in route handlers or React components: rejected because it
  duplicates policy and couples behavior to transport or presentation.
- AI tools as first-class business operations: rejected because model-facing
  schemas are adapters and cannot own policy or authorization.
- Separate capability implementations for workflows, MCP, or integrations:
  rejected because they create inconsistent business paths.

## Consequences

- Positive: One deterministic capability surface supports consistent rules,
  Authority, events, audit, and testing across every adapter.
- Tradeoff: Capability contracts require deliberate design and may add translation
  layers at entry points.
- Operational: New adapters must map onto existing capabilities or introduce a
  reviewed canonical capability rather than bypass the boundary.

## Constraints / guardrails

- Route handlers, UI components, tool callbacks, and provider adapters remain thin.
- Internal Nexus AI must not call Nexus's own HTTP API to reach business behavior.
- Capability implementation must not proceed in this ADR packet.

## Revisit triggers

- Implementation evidence shows the Command/Query distinction cannot represent a
  required capability without obscuring ownership or correctness.
- A new interaction model requires a reviewed extension while preserving one
  canonical business path.
