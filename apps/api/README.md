# `@nexus-v2/api`

Minimal Fastify HTTP adapter for Phase 0.

## Ownership

This package owns API process bootstrap, CORS configuration, and trivial `/health` and `/ready` routes. Routes must remain adapters and must not acquire Commands, Queries, domain rules, persistence, authentication, provider behavior, or other Nexus features during this work packet.

## Configuration

- `API_HOST`: listen host, default `127.0.0.1`.
- `API_PORT`: listen port, default `3000`.
- `WEB_ORIGIN`: permitted local web origin, default `http://127.0.0.1:5173`.

## Commands

- `pnpm --filter @nexus-v2/api build`
- `pnpm --filter @nexus-v2/api start`
- `pnpm --filter @nexus-v2/api typecheck`
