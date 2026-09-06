# ADR-0010: Provider-neutral observability with OpenTelemetry compatibility

- Status: Accepted
- Date: 2026-09-06
- Decision owners: Platform Architecture
- Related Architecture Contracts: AC-020, AC-021
- Related Foundation sections: 146 Alex Runtime - Tracing and Evaluation; 148
  Security, Secrets, Deployment, Reliability, and Observability - Observability
- Related implementation evidence: [observability guide](../../observability.md),
  [observability package](../../../packages/observability/README.md), and
  [contract registry](../contracts.registry.json)

## Context

Nexus needs technical logs, metrics, traces, and correlation without coupling business
code to one monitoring vendor. Diagnostic telemetry has different audiences,
retention, privacy, and semantics from Business Audit, AI Activity, and provider model
traces.

## Decision

Nexus technical telemetry uses a Nexus-owned abstraction with OpenTelemetry-compatible
interfaces. The current implementation provides structured logging, correlation and
request identifiers, redaction, and OpenTelemetry API boundaries with no required
exporter. Future cloud exporters attach at process composition boundaries.

Technical observability remains separate from Business Audit, AI Activity, and
provider traces. Sensitive business payloads are minimized or redacted by default.

## Alternatives considered

- Vendor SDK calls throughout business code: rejected because they couple domain
  behavior, schemas, and tests to one telemetry backend.
- Unstructured console logging: rejected because it lacks stable correlation,
  privacy, and machine-queryable semantics.
- Reusing the business audit trail for diagnostics: rejected because accountability
  records and operational telemetry have different purposes and controls.

## Consequences

- Positive: Telemetry can be tested locally, exported later, correlated across
  processes, and changed without rewriting business logic.
- Tradeoff: A shared abstraction requires schema discipline and may expose fewer
  vendor-specific features directly.
- Operational: Exporter selection, sampling, retention, alerts, and cost controls are
  configured at environment composition boundaries.

## Constraints / guardrails

- Technical logs must not become a copy of business payloads or credentials.
- Business Audit, AI Activity, provider traces, and technical telemetry retain
  distinct schemas and ownership.
- Provider exporters must not leak into domain packages.
- Correlation identifiers diagnose flow but do not replace canonical business IDs.

## Revisit triggers

- OpenTelemetry compatibility cannot express required operational evidence or creates
  unacceptable reliability or cost.
- Regulatory or incident-response evidence requires a reviewed extension while
  preserving layer separation.
