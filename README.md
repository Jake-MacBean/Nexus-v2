# Nexus v2

Nexus v2 is being built as a clean, TypeScript-first platform. This repository currently contains only the Phase 0 Engineering Harness. Substantive Nexus business features are intentionally out of scope.

## Current work packet

`P0.02-T01 - Scaffold shared and domain packages`

The repository contains minimal smoke-only deployable applications plus explicit package boundaries for Nexus architectural capabilities and domains. Every package remains an implementation-free scaffold.

## Prerequisites

- Node.js 24.20.0 LTS
- Corepack enabled
- pnpm 11.24.0, selected through the `packageManager` field

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

| Command                   | Purpose                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm build`              | Build/type-check the currently scaffolded TypeScript project graph.                    |
| `pnpm typecheck`          | Run the strict TypeScript compiler without emitting files.                             |
| `pnpm lint`               | Run the lint gate. The implementation is intentionally deferred in T01.                |
| `pnpm test`               | Run the test gate. The implementation is intentionally deferred in T01.                |
| `pnpm architecture:check` | Run architecture-contract checks. The implementation is intentionally deferred in T01. |
| `pnpm format:check`       | Verify formatting with Prettier.                                                       |
| `pnpm dev:web`            | Start the web development server.                                                      |
| `pnpm start:api`          | Start the previously built API application.                                            |
| `pnpm start:worker`       | Start the previously built worker health process.                                      |
| `pnpm preview:web`        | Preview the previously built web application.                                          |
| `pnpm verify`             | Run every current Phase 0 gate in dependency order.                                    |

Placeholder gates print an explicit message and succeed only because their implementations belong to later bounded Phase 0 work packets. They must be replaced rather than bypassed when those packets are executed.

## Environment configuration

Copy `.env.example` to a local `.env` when local overrides are needed. The example contains names and non-secret local values only. Never commit `.env`, credentials, production identifiers, customer data, or secret-looking placeholders.

The default local topology is:

- Web: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:3000/health`
- API readiness: `http://127.0.0.1:3000/ready`
- Worker health: `http://127.0.0.1:3001/health`

The web API endpoint is configured with `VITE_API_BASE_URL`. The API permits the configured `WEB_ORIGIN` for local cross-origin health checks.

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

Each package exposes only its root public entry point. Package READMEs state future ownership, prohibited responsibilities, allowed dependency direction, and concrete placement examples. Automated import enforcement is intentionally deferred to P0.02-T02.

## Controlling sources

Implementation must remain consistent with:

1. Nexus v2 Foundation v1.0
2. Nexus v2 Build Plan v1.0
3. Nexus v2 Architecture Contracts v1.0
4. Nexus v2 Phase 0 Codex Execution Package v1.0

If code evidence conflicts with a controlling decision, stop and record the conflict in an ADR before changing the architecture.
