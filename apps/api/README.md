# `@nexus-v2/api`

Minimal Fastify HTTP adapter with the Phase 0 technical observability baseline.

## Ownership

This package owns API process bootstrap, CORS configuration, centralized
request/correlation lifecycle hooks, and trivial `/health` and `/ready` routes.
Fastify's logger is disabled so the Nexus structured logger is the single
request-log path. Routes must remain adapters and must not acquire Commands,
Queries, domain rules, persistence, authentication, provider behavior, or other
Nexus features.

Every request receives validated `x-request-id` and `x-correlation-id` response
headers. `/health` means alive; `/ready` means ready for the current Phase 0 HTTP
surface and intentionally has no invented cloud, database, Temporal, or AI
dependency. Responses expose only safe status, service, and environment fields.

## Configuration

- `API_HOST`: listen host, default `127.0.0.1`.
- `API_PORT`: listen port, default `3000`.
- `WEB_ORIGIN`: permitted local web origin, default `http://127.0.0.1:5173`.

## Commands

- `pnpm --filter @nexus-v2/api build`
- `pnpm --filter @nexus-v2/api start`
- `pnpm --filter @nexus-v2/api typecheck`
