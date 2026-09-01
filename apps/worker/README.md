# `@nexus-v2/worker`

Minimal worker-process scaffold with the Phase 0 technical observability baseline.

## Ownership

This package owns process lifecycle, explicit `/health` and `/ready` reporting,
and `runWorkerOperation`, the technical context entry point for future adapters.
An operation preserves a valid incoming correlation ID, creates its own request/
operation ID, starts a Nexus span, and scopes structured logs. It does not define
a queue, job, workflow, event, Command, Query, integration, persistence, or
provider behavior.

Health means the process is alive. Readiness follows the worker's local lifecycle
state. Both technical endpoints return `x-request-id` and `x-correlation-id` and
safe status/service/environment bodies.

## Configuration

- `WORKER_HEALTH_HOST`: health-server host, default `127.0.0.1`.
- `WORKER_HEALTH_PORT`: health-server port, default `3001`.

## Commands

- `pnpm --filter @nexus-v2/worker build`
- `pnpm --filter @nexus-v2/worker start`
- `pnpm --filter @nexus-v2/worker typecheck`
