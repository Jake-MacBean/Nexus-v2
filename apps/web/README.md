# `@nexus-v2/web`

Minimal React/Vite smoke application for Phase 0.

## Ownership

This package owns browser bootstrap, presentation of scaffold health, and an HTTP adapter for the API health contract. It must not import server, domain, database, authority, workflow, provider, or infrastructure implementation packages. It contains no Nexus business behavior.

## Configuration

- `VITE_API_BASE_URL`: API origin used for the health request. Defaults to `http://127.0.0.1:3000`.
- The Phase 0 local Vite commands listen on port `5173`.

## Commands

- `pnpm --filter @nexus-v2/web dev`
- `pnpm --filter @nexus-v2/web build`
- `pnpm --filter @nexus-v2/web preview`
- `pnpm --filter @nexus-v2/web typecheck`
