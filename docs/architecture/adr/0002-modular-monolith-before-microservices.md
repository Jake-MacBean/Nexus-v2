# ADR-0002: Modular monolith before microservices

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Application Architecture
- Related Architecture Contracts: AC-002, AC-023
- Related Foundation sections: 145 Technical Platform Architecture
- Related implementation evidence: [repository architecture map](../README.md),
  [dependency rules](../../../architecture/README.md),
  [web application](../../../apps/web/README.md),
  [API application](../../../apps/api/README.md), and
  [worker application](../../../apps/worker/README.md)

## Context

Nexus has distinct business domains, but domain meaning alone does not justify a
network boundary. Starting with many services would introduce distributed state,
network failure, deployment coordination, and observability complexity before
scaling or ownership evidence exists.

## Decision

Nexus begins as a modular monolith with three current deployable process identities:
web, API, and worker. Cortex, Loop, Axis, Signal, Current, Edge, and cross-cutting
packages are code and ownership modules, not independent microservices. Domain
boundaries are enforced in code first. Services earn separation only through
demonstrated scaling, reliability, security, or operational-ownership need.

## Alternatives considered

- A microservice per domain: rejected because domain names alone do not establish
  operational independence and would add distributed consistency costs.
- One undifferentiated application: rejected because deployable concerns and
  background work still require clear process and package boundaries.
- Serverless function-per-capability: rejected because it fragments ownership and
  durable business behavior without current evidence.

## Consequences

- Positive: Domain design can mature with low operational burden and atomic local
  transactions.
- Tradeoff: Modules share a deployment and datastore failure domain until separation
  earns its cost.
- Operational: Web, API, and worker may scale independently; package boundaries
  remain the primary business-architecture enforcement mechanism.

## Constraints / guardrails

- A package boundary is not permission to bypass public contracts or ownership.
- Cross-domain orchestration belongs in application capabilities, events, or
  workflows rather than direct domain coupling.
- Future service extraction requires a new ADR supported by operational evidence.

## Revisit triggers

- Measured scaling, availability, security isolation, or team ownership requires an
  independent deployment lifecycle.
- A well-defined module can be extracted without duplicating canonical truth or
  introducing inconsistent business paths.
