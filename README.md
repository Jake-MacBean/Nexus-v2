# Nexus v2

Nexus v2 is being built as a clean, TypeScript-first platform. This repository currently contains only the Phase 0 Engineering Harness. Substantive Nexus business features are intentionally out of scope.

## Current work packet

`P0.04-T02 - Create deterministic fixture and seeding conventions`

The repository contains minimal smoke-only deployable applications, explicit package boundaries, a repeatable PostgreSQL/Drizzle migration harness, and deterministic test-only fixture conventions. No Nexus business schema or behavior has been introduced.

## Prerequisites

- Node.js 24.20.0 LTS
- Corepack enabled
- pnpm 11.24.0, selected through the `packageManager` field
- Docker Desktop with the Linux container engine and Docker Compose

Use the pinned Node version from `.nvmrc` or `.node-version`. Do not use npm, Yarn, or an unpinned pnpm release for repository operations.

## Bootstrap

```shell
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm verify
```

For the initial checkout, before a lockfile exists, use `pnpm install`. The committed lockfile is authoritative afterward.

## Root commands

| Command                          | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `pnpm build`                     | Build/type-check the currently scaffolded TypeScript project graph.     |
| `pnpm typecheck`                 | Run the strict TypeScript compiler without emitting files.              |
| `pnpm lint`                      | Run the lint gate. The implementation is intentionally deferred in T01. |
| `pnpm test`                      | Run the test gate. The implementation is intentionally deferred in T01. |
| `pnpm architecture:check`        | Validate the real workspace source and manifest dependency graph.       |
| `pnpm architecture:test`         | Run positive and negative fixture tests for the architecture checker.   |
| `pnpm database:governance`       | Validate committed migration artifacts and prohibit schema push.        |
| `pnpm db:local:up`               | Start and health-check only the local PostgreSQL service.               |
| `pnpm db:generate`               | Generate a reviewable SQL migration from the approved Drizzle schema.   |
| `pnpm db:check`                  | Validate migration snapshots plus repository database governance.       |
| `pnpm db:migrate`                | Apply only pending committed migrations.                                |
| `pnpm db:status`                 | Report database identity, server, migration, and sentinel-table status. |
| `pnpm db:test:integration`       | Run the destructive, strictly local migration lifecycle test.           |
| `pnpm db:rebuild`                | Strictly local-only database rebuild, migration, and status check.      |
| `pnpm format:check`              | Verify formatting with Prettier.                                        |
| `pnpm fixtures:test`             | Verify deterministic descriptors, safety, and fixture-scope cleanup.    |
| `pnpm fixtures:test:integration` | Prove temporary PostgreSQL fixture setup and teardown locally.          |
| `pnpm infra:up`                  | Start and health-check local PostgreSQL and Temporal.                   |
| `pnpm infra:health`              | Validate the intended PostgreSQL database and Temporal namespace.       |
| `pnpm infra:down`                | Stop local infrastructure without deleting its data.                    |
| `pnpm infra:reset`               | Reset only Nexus v2 local data, then recreate and verify the services.  |
| `pnpm infra:logs`                | Print recent local infrastructure logs.                                 |
| `pnpm dev:web`                   | Start the web development server.                                       |
| `pnpm start:api`                 | Start the previously built API application.                             |
| `pnpm start:worker`              | Start the previously built worker health process.                       |
| `pnpm preview:web`               | Preview the previously built web application.                           |
| `pnpm verify`                    | Run every current Phase 0 gate in dependency order.                     |

The lint and general test gates remain explicit placeholders because their implementations belong to later bounded Phase 0 work packets. The architecture gate is real and runs both its fixture suite and repository validation through `pnpm verify`.

The database governance gate also runs in `pnpm verify` without requiring live infrastructure. Live database commands require `DATABASE_URL`; use the loopback-only value in `.env.example`. See `packages/database/README.md` for connection ownership, migration authoring, rebuild safety, and drift-detection limits.

The deterministic, infrastructure-independent fixture suite also runs in `pnpm verify`. PostgreSQL fixture integration is a focused live check invoked with `pnpm fixtures:test:integration`; it creates and removes only uniquely named test schemas. See `packages/testing/README.md` for fixture naming, fictional-data requirements, lifecycle guarantees, database isolation, and the Phase 1 extension rule.

## Environment configuration

Copy `.env.example` to a local `.env` when local overrides are needed. The example contains names and non-secret local values only. Never commit `.env`, credentials, production identifiers, customer data, or secret-looking placeholders.

The default local topology is:

- Web: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:3000/health`
- API readiness: `http://127.0.0.1:3000/ready`
- Worker health: `http://127.0.0.1:3001/health`
- PostgreSQL: `127.0.0.1:55432`, database/user `nexus_v2_dev`
- Temporal gRPC: `127.0.0.1:7233`, namespace `nexus-v2-local`
- Temporal UI: `http://127.0.0.1:8233`

The web API endpoint is configured with `VITE_API_BASE_URL`. The API permits the configured `WEB_ORIGIN` for local cross-origin health checks.

## Local infrastructure

PostgreSQL is Nexus's local canonical-data service. Temporal is Nexus's local durable-workflow runtime. Their responsibilities and persistent state remain separate: PostgreSQL uses `nexus-v2-local-postgres-data`, while Temporal's official lightweight development server uses `nexus-v2-local-temporal-data` for its embedded SQLite state.

The images are pinned to `postgres:18.6` and `temporalio/temporal:1.8.2`; `latest` is not used. Start everything with `pnpm infra:up`, validate it with `pnpm infra:health`, and stop it without data loss using `pnpm infra:down`.

`pnpm infra:reset` is intentionally destructive only to the Compose project `nexus-v2-local` and its two explicitly allow-listed local volumes. It verifies the rendered project, service, and volume names before removing data, then recreates both services and proves they are healthy. It never deletes unrelated Docker resources or contacts cloud infrastructure.

See `infra/README.md` for exact credentials, optional local port overrides, health-check behavior, reset details, and troubleshooting for Docker availability, occupied ports, and unhealthy containers.

## Application boundaries

| Application   | Owns                                                | Must not own                                                        |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/web`    | React smoke UI and API-health adapter               | Server, domain, database, authentication, or business logic         |
| `apps/api`    | Fastify process and trivial health/readiness routes | Commands, queries, domain rules, persistence, or provider logic     |
| `apps/worker` | Worker process lifecycle and basic health reporting | Business jobs, workflows, schedules, persistence, or provider logic |

Each application has a local README documenting its commands, environment inputs, and forbidden responsibilities.

## Package topology

Nexus begins as a TypeScript modular monolith. `apps/*` are deployable adapter surfaces; `packages/*` hold architectural capabilities and domain responsibilities. A package boundary establishes code ownership and dependency direction, not a separately deployed microservice. Services earn deployment separation only when scaling, reliability, security, or operational ownership creates a demonstrated need.

### Cross-cutting capability packages

| Package         | Responsibility                                                    |
| --------------- | ----------------------------------------------------------------- |
| `kernel`        | Domain-neutral primitives that truly apply across Nexus           |
| `contracts`     | Stable schemas and contracts crossing approved boundaries         |
| `application`   | Future canonical Commands, Queries, and application orchestration |
| `database`      | Persistence, migrations, and database adapters                    |
| `authority`     | Future authority evaluation and enforcement boundary              |
| `audit`         | Reconstructable business accountability evidence                  |
| `events`        | Canonical event contracts and durable publishing boundary         |
| `workflows`     | Durable workflow execution and runtime integration                |
| `integrations`  | External provider adapters and translation boundaries             |
| `ai`            | Model Gateway, Alex runtime, reasoning, and tool adapters         |
| `memory`        | Structured and episodic memory retrieval infrastructure           |
| `workspaces`    | Visual Grammar and Workspace Specification contracts              |
| `observability` | Technical logs, metrics, traces, and health telemetry             |
| `testing`       | Test-only fixtures, builders, fakes, and harness support          |

### Domain packages

| Package   | Canonical responsibility                                              |
| --------- | --------------------------------------------------------------------- |
| `cortex`  | Tasks, projects, commitments, scheduling, and operational execution   |
| `loop`    | People, organizations, relationships, roles, and interaction history  |
| `axis`    | Opportunities, proposals, contracts, and commercial progression       |
| `signal`  | Marketing programs, campaigns, content, audiences, and learning       |
| `current` | Banking, AR/AP, invoices, payments, expenses, budgets, and cash flow  |
| `edge`    | Derived cross-domain intelligence without duplicating canonical facts |

Each package exposes only its root public entry point. Package READMEs state future ownership, prohibited responsibilities, allowed dependency direction, and concrete placement examples.

## Automated architecture enforcement

The repository-owned checker parses every TypeScript and TSX module under workspace `src` directories and validates source imports, Nexus dependencies declared in workspace manifests, public entry points, package-specific allow-lists, and circular package dependencies. `architecture/policy.mjs` is the single policy location; workspace paths and names are discovered from the repository rather than copied into the checker.

Run `pnpm architecture:check` for the real repository and `pnpm architecture:test` for isolated positive and intentional-negative fixtures. A failure reports the importing workspace and file, the imported package or path, and the rule to fix. See `architecture/README.md` for the complete encoded model and remediation guidance.

## Controlling sources

Implementation must remain consistent with:

1. Nexus v2 Foundation v1.0
2. Nexus v2 Build Plan v1.0
3. Nexus v2 Architecture Contracts v1.0
4. Nexus v2 Phase 0 Codex Execution Package v1.0

If code evidence conflicts with a controlling decision, stop and record the conflict in an ADR before changing the architecture.
