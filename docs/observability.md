# Nexus technical observability guide

This guide is the repository-level entry point for P0.09-T01. The implementation
contract and examples live in
[`packages/observability/README.md`](../packages/observability/README.md).

## Governing distinction

Activity is visibility. Audit is accountability. Observability is diagnosis.

Technical observability diagnoses the system. It does not become a second record
of business truth. Business Audit, AI Activity, provider traces, Smart Stream,
and technical telemetry retain separate owners, records, audiences, and privacy
requirements. Correlation IDs may connect them later without merging them.

## Current runtime flow

```text
web health call
  x-correlation-id: bounded logical activity
  x-request-id: browser HTTP hop
          |
          v
API Fastify onRequest hook
  validate/replace identifiers
  create API span (no-op unless a provider exists)
  AsyncLocalStorage context
  structured start/completion logs
  response correlation headers

worker technical operation (test/future adapter entry)
  preserve logical correlation ID
  create a distinct operation/request ID
  create worker span
  structured start/completion logs
```

The API does not call worker. The deterministic smoke test invokes each path
independently with one correlation ID to prove the future propagation contract.
No queue, workflow, event, job, or business transport exists yet.

## Application participation

- API correlation is centralized in Fastify lifecycle hooks. Route handlers stay
  trivial and do not parse headers or create loggers.
- Worker adapters enter through `runWorkerOperation`, preserve an incoming
  correlation ID, create their own operation ID, and scope async context.
- Web-controlled HTTP calls create `x-request-id` and `x-correlation-id`; the web
  app does not ship browser logs or maintain a session-long tracking ID.
- Future process composition may register an OpenTelemetry provider/exporter.
  Business and domain code continues to use only the Nexus abstraction.

## Operational endpoints

| Process | Endpoint      | Meaning                                         |
| ------- | ------------- | ----------------------------------------------- |
| API     | `GET /health` | API process is alive                            |
| API     | `GET /ready`  | API can accept its current Phase 0 HTTP traffic |
| Worker  | `GET /health` | Worker process is alive                         |
| Worker  | `GET /ready`  | Worker lifecycle state is ready                 |

Responses contain only `status`, `service`, and `environment`, plus correlation
headers. Readiness deliberately has no dependency on Google Cloud, Temporal, an
AI provider, or a database not used by the current runtime path.

## Logging rules

Log metadata by default, not business payloads.

Allowed examples include method, route path, status code, duration, process
state, technical operation name, and safe error type/message/stack. Never log
bodies, complete headers, authorization/cookies, secrets, database URLs,
customer documents, messages, financial data, model content, or provider
payloads. The sanitizer is defense in depth; it is not permission to pass whole
objects to the logger.

Production Node output is deterministic JSON through Pino. Tests inject the
in-memory sink and inspect the same structured entry contract. Direct production
console logging was removed from the worker path owned by this packet.

## Trace and metric behavior

The official OpenTelemetry API is the compatibility boundary. With no provider,
spans and meters are safe no-ops and logs contain no invented trace identifiers.
The focused test suite installs an in-memory SDK provider and proves real
`trace_id`/`span_id` fields and completed spans without external I/O.

There is no Google exporter, Cloud Trace setup, collector, dashboard, alert,
SLO, SaaS SDK, or browser analytics. P0.08-T02 remains deferred. A future exporter
must be registered at application composition, preserve privacy defaults, use
short-lived environment credentials, and require a separate reviewed packet.

## Commands

```text
pnpm observability:test
pnpm test:unit
pnpm typecheck
pnpm architecture:check
pnpm contracts:check
pnpm security:check
pnpm verify
```

All observability tests are deterministic and network-free. The canonical smoke
proof is `testing/observability-smoke.test.ts`.
