# `@nexus-v2/worker`

Minimal worker-process scaffold for Phase 0.

## Ownership

This package owns process lifecycle and basic health reporting only. It must not run business jobs, schedules, workflows, Commands, Queries, persistence, integrations, or provider behavior during this work packet.

## Configuration

- `WORKER_HEALTH_HOST`: health-server host, default `127.0.0.1`.
- `WORKER_HEALTH_PORT`: health-server port, default `3001`.

## Commands

- `pnpm --filter @nexus-v2/worker build`
- `pnpm --filter @nexus-v2/worker start`
- `pnpm --filter @nexus-v2/worker typecheck`
