# ADR-0005: Temporal for durable workflow execution

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Application Architecture
- Related Architecture Contracts: AC-007, AC-008
- Related Foundation sections: 144 MCP and External Interface Architecture -
  Long-Running External Work; 145 Technical Platform Architecture - Durable
  Workflows and Events
- Related implementation evidence: [workflow package scaffold](../../../packages/workflows/README.md),
  [local infrastructure guide](../../../infra/README.md), and
  [contract registry](../contracts.registry.json). Local Temporal infrastructure
  exists; Nexus business workflows are not yet implemented.

## Context

Long-running and failure-sensitive work requires durable waits, timers, retries,
approvals, and recovery across process restarts and deployments. In-process handlers
or model conversation state cannot provide reliable execution history.

## Decision

Temporal is the preferred initial runtime for durable workflow execution. It owns
execution state, retry policy, timers, waits, and orchestration recovery. Canonical
Nexus/PostgreSQL records remain the source of business truth, including business-
facing Workflow, Action, Approval, and Outcome records.

The decision is Accepted. Phase 0 supplies repeatable local Temporal infrastructure
and a package boundary; substantive business workflows remain future work.

## Alternatives considered

- Ad hoc cron and job tables: rejected as a general workflow engine because recovery,
  timers, and execution semantics would become custom infrastructure.
- In-process event handlers: rejected because execution state would not survive
  failure or deployment reliably.
- Model conversation state: rejected because models provide judgment, not durable
  execution guarantees.
- A custom workflow engine: rejected because it would recreate complex, mature
  infrastructure without evidence that Nexus requires it.

## Consequences

- Positive: Durable orchestration gains explicit history, retries, timers, and
  restart recovery.
- Tradeoff: Temporal adds operational infrastructure and requires deterministic
  workflow-design discipline.
- Operational: Workers are separated from request-serving paths where appropriate,
  while canonical business status remains queryable from Nexus records.

## Constraints / guardrails

- Temporal state is execution machinery, not canonical business truth.
- Workflows invoke canonical Commands and Queries rather than reimplementing policy.
- Uncertain external effects reconcile before retry.
- Models must not own durable workflow state.

## Revisit triggers

- Production evidence shows Temporal cannot meet required reliability, portability,
  cost, or operating constraints.
- The workflow workload remains sufficiently simple that a narrower durable
  mechanism can satisfy AC-007 and AC-008 without custom fragility.
