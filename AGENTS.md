# Nexus v2 repository operating guide

This file is the canonical repository-level instruction surface for Codex and
developers. Read it before changing Nexus. Use the linked documents for detail;
do not rely on chat history for architecture or operating rules.

## Project purpose and current reality

Nexus v2 is a TypeScript-first, multi-organization business operating system
centered on Alex as the singular user-facing orchestrator. The intended
architecture is a modular monolith with a React web app, Fastify API, Node worker,
PostgreSQL/Drizzle persistence, Temporal durable execution, future Google Cloud
production infrastructure, deterministic Commands and Queries, central Authority,
canonical domain ownership, provider adapters, generated structured workspaces,
technical observability, and evaluations.

Architecture intent is not implementation status. The repository currently contains
the Phase 0 Engineering Harness and smoke behavior only. Alex, business Commands and
Queries, Authority, Organization/User/Person models, business domains, durable events,
real workflows, provider integrations, and generated workspaces are not implemented.

## Canonical hierarchy and conflicts

Higher items control lower items:

1. Nexus v2 Foundation v1.0
2. Nexus v2 Architecture Contracts v1.0
3. Nexus v2 Build Plan v1.0
4. Current Phase Execution Package
5. Repository ADRs
6. Package and module documentation
7. Task-specific instructions

The first four are external controlling artifacts supplied with the relevant work
packet; the repository does not duplicate them. The executable contract index is
[docs/architecture/contracts.registry.json](docs/architecture/contracts.registry.json).

**DO NOT SILENTLY REVISE THE FOUNDATION.** If implementation evidence conflicts with
a controlling decision, stop. Report the conflict and evidence, and request the
smallest architectural decision required. A material architecture change requires
explicit review and, when appropriate, an ADR and/or an updated canonical artifact.
A lower-level instruction never silently overrides a higher-level source.

## Current build status

Phase 0 is nearly complete, but it is not complete.

Completed harness work:

- repository and pinned toolchain skeleton;
- web, API, and worker smoke applications;
- package topology and automated architecture enforcement;
- repeatable local PostgreSQL and Temporal infrastructure;
- Drizzle migration harness and deterministic fixtures;
- Vitest correctness and provider-free evaluation harnesses;
- Architecture Contract registry;
- secret and environment governance;
- GitHub Actions verification workflow;
- Terraform environment skeleton;
- observability and correlation baseline;
- feature-flag and Shadow Mode abstraction.

P0.08-T02 provides the dev GitHub OIDC/Workload Identity Federation bootstrap
and manual identity smoke without applying application infrastructure. Its
deployment-resource IAM remains deliberately deferred to the first reviewed
deployment plan.

The baseline [Architecture Decision Records](docs/architecture/adr/README.md) make
major implementation decisions and supersession rules durable. P0.10-T03 deployment
smoke and Phase 0 exit remain upcoming. Do not mark Phase 0 complete before a
non-production deployment and its exit gates pass.

## Repository map

Applications are deployable adapter surfaces, not owners of business policy.

| Path          | Ownership                                                                |
| ------------- | ------------------------------------------------------------------------ |
| `apps/web`    | React smoke UI and controlled API-health adapter                         |
| `apps/api`    | Fastify process, technical request context, and health/readiness routes  |
| `apps/worker` | Node worker lifecycle, technical operation context, and health/readiness |

Cross-cutting packages:

| Path                     | Ownership                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `packages/kernel`        | Domain-neutral primitives and promotion-control contracts                                  |
| `packages/contracts`     | Stable schemas crossing approved boundaries                                                |
| `packages/application`   | Future Commands/Queries and application orchestration; current promotion executor boundary |
| `packages/database`      | PostgreSQL/Drizzle mappings, migrations, and persistence mechanics                         |
| `packages/authority`     | Future central Authority evaluation and enforcement boundary                               |
| `packages/audit`         | Future reconstructable business-accountability evidence                                    |
| `packages/events`        | Future canonical event contracts and durable publishing boundary                           |
| `packages/workflows`     | Future Temporal-backed durable execution integration                                       |
| `packages/integrations`  | Future external-provider translation adapters                                              |
| `packages/ai`            | Future Model Gateway, Alex runtime, reasoning, and tool adapters                           |
| `packages/memory`        | Future structured/episodic memory and permission-aware retrieval infrastructure            |
| `packages/workspaces`    | Future Visual Grammar and Workspace Specification contracts                                |
| `packages/observability` | Technical logging, correlation, tracing, metrics boundary, and safe telemetry              |
| `packages/testing`       | Test-only descriptors, fixtures, fakes, and harness support                                |

Canonical domain packages are scaffolds today:

| Path               | Canonical responsibility                                             |
| ------------------ | -------------------------------------------------------------------- |
| `packages/cortex`  | Tasks, projects, commitments, scheduling, and operational execution  |
| `packages/loop`    | People, organizations, relationships, roles, and interaction history |
| `packages/axis`    | Opportunities, proposals, contracts, and commercial progression      |
| `packages/signal`  | Marketing programs, campaigns, content, audiences, and learning      |
| `packages/current` | Banking, AR/AP, invoices, payments, expenses, budgets, and cash flow |
| `packages/edge`    | Derived cross-domain intelligence without duplicate canonical facts  |

Each package README is the detailed placement guide. The compact navigation map is
[docs/architecture/README.md](docs/architecture/README.md).

## Ownership and dependency rules

**One real-world thing gets one canonical owner.** Domains own responsibility, not
duplicate reality. Cross-domain orchestration belongs in application capabilities,
events, or workflows—not arbitrary domain-to-domain imports. Edge owns evidence-linked
derived intelligence, never copies of canonical facts.

[architecture/policy.mjs](architecture/policy.mjs) is the normative machine allow-list;
[architecture/README.md](architecture/README.md) explains it. In summary:

- packages never depend on apps, and apps do not depend on each other;
- domain packages do not import other domain implementations;
- domains do not depend on database, AI, integrations, or workspaces;
- AI is an adapter and must not own business logic or write the database directly;
- database owns persistence mechanics, not domain policy;
- integrations translate providers, not canonical behavior;
- workspaces are governed projections, not canonical data;
- technical observability is not Business Audit;
- production source cannot depend on `packages/testing`;
- cross-package imports use public `@nexus-v2/<package>` root entry points only;
- deep, relative cross-workspace, undeclared, and circular production dependencies
  are prohibited.

Run `pnpm architecture:check`. Fix the ownership or dependency; never weaken or route
around the checker merely to make CI green.

## Canonical business capabilities and Authority

Commands and Queries will be the canonical application capabilities. Future web/API,
AI, MCP, workflows, and integrations must enter business behavior through those same
capabilities instead of creating alternate paths. Internal Nexus AI must not call
Nexus's own HTTP API. Commands and Queries are architecture intent and are not yet
implemented.

Future Authority is the central gate for every consequential action. No UI, adapter,
AI tool, workflow, integration, or feature flag may bypass it.

**Feature enabled does not mean authorized.** Current promotion control decides only
`disabled`, `shadow`, or `enabled` eligibility. Shadow Mode may compute and record a
proposal, but it never invokes the side-effect executor. See
[docs/promotion-control.md](docs/promotion-control.md).

## Local setup

Required:

- Node.js `24.20.0`, pinned in `.node-version` and `.nvmrc`;
- pnpm `11.24.0`, selected by `packageManager` and the engine constraint;
- Corepack;
- Docker Desktop with Linux containers and Docker Compose only when local
  infrastructure or integration tests are needed.

Minimum Docker-free path:

```shell
corepack enable
corepack install
pnpm install --frozen-lockfile
pnpm verify
```

Copy `.env.example` to an untracked `.env` only when local overrides or live local
database commands are needed. Use only the loopback values documented there.

Infrastructure lifecycle:

```shell
pnpm infra:up
pnpm infra:health
pnpm infra:down
```

Use `pnpm db:local:up` to start PostgreSQL without Temporal. See
[infra/README.md](infra/README.md) and
[packages/database/README.md](packages/database/README.md). `pnpm verify` does not
require Docker, PostgreSQL, Temporal, GCP, credentials, or providers.

## Verification, testing, and fixtures

The default Definition-of-Done gate is `pnpm verify`. It is designed to be
Docker-free, GCP-free, provider-free, telemetry-network-free, and AI-cost-free.

Useful focused commands:

| Command                   | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `pnpm format:check`       | Check repository formatting                             |
| `pnpm typecheck`          | Check strict TypeScript across workspaces and harnesses |
| `pnpm build`              | Build all current applications and packages             |
| `pnpm test:unit`          | Run fast deterministic Node/jsdom correctness tests     |
| `pnpm test:integration`   | Run explicit local PostgreSQL integration suites        |
| `pnpm architecture:check` | Validate actual workspace boundaries                    |
| `pnpm architecture:test`  | Test the architecture checker itself                    |
| `pnpm contracts:check`    | Validate contract metadata and evidence references      |
| `pnpm contracts:test`     | Run contract-framework evidence                         |
| `pnpm security:check`     | Run environment and working/history secret checks       |
| `pnpm eval:self`          | Prove evaluation mechanics without a provider           |
| `pnpm db:check`           | Check migrations and database governance                |
| `pnpm db:status`          | Inspect an explicitly configured local database         |
| `pnpm observability:test` | Run local logging/privacy/correlation proofs            |

[docs/testing.md](docs/testing.md) is normative repository guidance for test
classification:

- Unit tests are fast, deterministic, and require no Docker, provider, or network.
- Integration tests use explicit guarded local infrastructure and synthetic fixtures,
  never production or customer data.
- Evaluations measure judgment or behavior separately from deterministic correctness.
  Planned scenarios remain visibly skipped, never passing. Default verification makes
  no model/API calls and incurs no AI cost. See
  [evaluations/README.md](evaluations/README.md).
- Contract tests tie evidence to Architecture Contract IDs and must not fake runtime
  enforcement for a capability that does not exist.

`packages/testing` is the sole shared fixture system. Production source may not import
it. Fixtures use synthetic data and must not become shadow domain models. Once a real
production object exists, fixture builders consume its production contract instead of
duplicating invariants.

## Database and migration rules

PostgreSQL is canonical persistence and Drizzle is the current TypeScript database
layer. `packages/database` owns mappings and mechanics, not business ownership.

Schema workflow:

1. Change the approved Drizzle schema.
2. Run `pnpm db:generate -- --name=<descriptive_name>` with the guarded local setup.
3. Review generated SQL, journal, and snapshot artifacts.
4. Run `pnpm db:check`, `pnpm db:test:integration`, and `pnpm verify`.
5. Commit schema and migration artifacts together.

Only reviewed, version-controlled migrations change shared or production schema.
`drizzle-kit push` is prohibited. Applied migrations are immutable; corrections use a
new forward migration. Use guarded local commands such as `pnpm db:rebuild`; do not
normalize raw destructive SQL as an everyday workflow.

## Events and workflows: future architecture

Durable business events and real workflows are not implemented. When introduced:

- canonical business events are durable;
- a domain transaction and its outbox write are atomic;
- Temporal owns durable execution state, retries, timers, and orchestration;
- canonical business truth remains in Nexus domain records;
- workflows never become the business source of truth;
- an uncertain external side effect must reconcile before retry.

## Observability

Technical observability diagnoses the system. It is not Business Audit, AI Activity,
Smart Stream, or provider-trace storage. Propagate request/correlation identifiers,
log technical metadata rather than business payloads, and rely on the shared
redaction boundary for sensitive metadata. See
[docs/observability.md](docs/observability.md).

## Secrets and environments

Never commit secrets, real credentials, customer data, or real `.env` files.
`.env.example` contains only registered approved public or local-safe examples. Every
environment variable must be registered in
[docs/security/environment.registry.json](docs/security/environment.registry.json).
`VITE_` values are browser-public and must never contain secrets.

Future staging and production secrets come from independently scoped Google Secret
Manager resources. Gitleaks scans the working tree and full Git history through
`pnpm security:check`. If a likely real secret is found, stop; do not print, move,
commit, or allowlist it. Follow [docs/security/README.md](docs/security/README.md).

## GCP and deployment status

The [Terraform skeleton](infra/terraform/README.md) exists but its application roots
have never been applied. The separately owned dev identity bootstrap creates only the
GitHub-to-Google workload identity path and read-only smoke access. No Nexus GCP
application environment is deployed. P0.10-T03 must review exact deployment-resource
IAM before the first non-production deployment.

## Nexus v1 rule

**Copy ideas, not code, unless code earns its way.** Nexus v1 is an archaeology and
migration source, not v2 architecture. Do not copy v1 code or data wholesale. Any
reuse must be reviewed against v2 ownership, multi-organization isolation, Authority,
events, workflows, memory, and security.

## Work-packet lifecycle

Codex work must remain bounded:

1. Confirm the accepted baseline commit and clean state.
2. Read the controlling sources.
3. Inspect the actual repository state.
4. Work only inside allowed scope.
5. Do not invent architecture to resolve ambiguity.
6. Implement exactly one packet.
7. Run all required focused checks.
8. Run `pnpm verify`.
9. Run fresh-clone proof when required.
10. Commit one bounded change.
11. Return the required closeout report.
12. Do not begin the next packet.

### Reusable work-packet template

```markdown
# <Task ID — title>

Objective: <one bounded outcome>
Accepted baseline commit: <full hash>
Controlling references: <canonical documents in priority order>
Allowed scope: <paths and systems>
Architecture contracts: <AC IDs>
Required behavior: <observable requirements>
Prohibited behavior: <scope and safety exclusions>
Tests/evaluations: <deterministic proof required>
Acceptance criteria: <binary completion checks>
Verification commands: <focused checks plus pnpm verify>
Closeout report: <files, decisions, evidence, risks, commit, final state>
Stop/escalation conditions: <conflicts or decisions outside scope>
```

## Stop and escalation rules

Stop instead of guessing when:

- controlling documents conflict;
- implementation requires a prohibited dependency or package boundary;
- a new package appears necessary;
- production schema must be invented outside the packet;
- a real secret or credential is discovered;
- an unexpected destructive migration is required;
- an Architecture Contract would need to be weakened;
- cloud deployment is required while P0.08-T02 remains deferred;
- repository state differs materially from the accepted baseline;
- acceptance criteria cannot be met inside allowed scope.

Report the conflict, concrete repository/canonical evidence, and the smallest decision
needed. Do not quietly widen scope.

## Definition of Done

A task is not done merely because code compiles. Where applicable, completion means:

- accepted baseline and clean starting state were verified;
- allowed scope and canonical architecture were respected;
- deterministic tests were added and relevant Architecture Contracts preserved;
- security/environment checks and documentation are current;
- migrations were reviewed when present and evaluation status remains honest;
- `pnpm verify` and required integration/fresh-clone proofs pass;
- no secret, unintended process, cloud resource, or external side effect remains;
- exactly one bounded commit exists and the working tree is clean;
- the closeout report includes files, decisions, commands/evidence, acceptance status,
  risks/deviations, commit hash, and final state;
- the next task was not started.
