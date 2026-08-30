# Nexus v2 local infrastructure

This stack is exclusively for local development. It does not use or connect to
Google Cloud, production credentials, customer data, or production services.

PostgreSQL is Nexus's local canonical-data service. Temporal is Nexus's local
durable-workflow runtime. They have separate named volumes because canonical
business data and workflow execution state are separate responsibilities.

## Prerequisite

Install Docker Desktop with Docker Compose and start its Linux container engine.
Confirm it is ready with `docker version` and `docker compose version`.

## Services

| Service     | Exact image                 | Host endpoint           | Local identity                       | Volume                               |
| ----------- | --------------------------- | ----------------------- | ------------------------------------ | ------------------------------------ |
| PostgreSQL  | `postgres:18.6`             | `127.0.0.1:55432`       | DB/user `nexus_v2_dev`               | `nexus-v2-local-postgres-data`       |
| Temporal    | `temporalio/temporal:1.8.2` | gRPC `127.0.0.1:7233`   | Namespace `nexus-v2-local`           | `nexus-v2-local-temporal-data`       |
| Temporal UI | Included in Temporal image  | <http://127.0.0.1:8233> | Local development UI; no credentials | Uses Temporal's separate local state |

PostgreSQL uses the explicit local-only password
`nexus_v2_dev_local_only`. It is intentionally not a secret and must never be
reused outside this local stack. Temporal uses its official lightweight
development server with local SQLite persistence; this Compose file makes no
decision about future staging or production Temporal deployment.

Port 55432 avoids the PostgreSQL instance already using port 5432 on the current
Windows development machine. The host bindings use `127.0.0.1` and are not
published on external interfaces.

## Lifecycle

Run commands at the repository root:

| Command             | Behavior                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm infra:up`     | Start both services in the background, wait, and run meaningful health checks.                 |
| `pnpm infra:health` | Verify the intended PostgreSQL database and Temporal namespace.                                |
| `pnpm infra:down`   | Stop the local Compose project while preserving both named volumes.                            |
| `pnpm infra:reset`  | Delete only the two allow-listed Nexus v2 local volumes, recreate services, and verify health. |
| `pnpm infra:logs`   | Print the most recent 200 log lines for the local services.                                    |

`infra:reset` is destructive only to local Nexus v2 data. Before deletion, the
script renders the Compose model and refuses to continue unless the project is
exactly `nexus-v2-local`, the services are exactly `postgres` and `temporal`,
and the volumes are exactly:

- `nexus-v2-local-postgres-data`
- `nexus-v2-local-temporal-data`

The reset uses project-scoped `docker compose down --volumes`; it never enumerates
or deletes unrelated Docker resources and never contacts cloud infrastructure.

## Health behavior

PostgreSQL health runs `pg_isready` and then executes
`SELECT current_database()` against `nexus_v2_dev`. Temporal health invokes the
Temporal CLI inside the development container and describes the
`nexus-v2-local` namespace through the gRPC frontend. A running container alone
does not count as healthy.

Every failure names the unavailable service and suggests either
`pnpm infra:up` or `pnpm infra:logs`. Missing Docker and a stopped Docker Desktop
engine receive separate installation/startup guidance.

## Local configuration

The defaults need no `.env`. Optional host-port overrides may be placed in the
ignored root `.env` file:

```dotenv
NEXUS_LOCAL_POSTGRES_PORT=55432
NEXUS_LOCAL_TEMPORAL_GRPC_PORT=7233
NEXUS_LOCAL_TEMPORAL_UI_PORT=8233
```

If the PostgreSQL port changes, update the local `DATABASE_URL` host port to
match. If the Temporal gRPC port changes, update `TEMPORAL_ADDRESS` as well.
These settings are local only; staging and production configuration must not
use this Compose file or its credentials.

## Troubleshooting

- **Docker command missing:** install Docker Desktop with Docker Compose.
- **Docker engine unavailable:** start Docker Desktop and wait until
  `docker version` shows both client and server information.
- **Port occupied:** choose an unused port in `.env`, then run
  `pnpm infra:up` again. Keep `DATABASE_URL` aligned with the PostgreSQL port.
- **Service unhealthy:** run `pnpm infra:logs`, correct the reported problem,
  and retry `pnpm infra:up` or `pnpm infra:health`.
- **Known-clean local state required:** run `pnpm infra:reset`; this destroys
  only the two explicitly named Nexus v2 local volumes above.
