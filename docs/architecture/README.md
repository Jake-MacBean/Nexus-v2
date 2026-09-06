# Nexus v2 architecture map

This page routes developers and Codex to the repository's architecture and governance
evidence. Start with the root [AGENTS.md](../../AGENTS.md) operating guide. It explains
current status, setup, ownership, verification, escalation, and Definition of Done.

## Canonical normative sources

These external artifacts control the build, in this order:

1. Nexus v2 Foundation v1.0
2. Nexus v2 Architecture Contracts v1.0
3. Nexus v2 Build Plan v1.0
4. Current Phase Execution Package

They are supplied with the relevant work packet and are not duplicated in this
repository. If repository guidance conflicts with one of them, stop and escalate; do
not silently revise the higher-level source.

The machine-readable [Architecture Contract registry](contracts.registry.json) mirrors
AC-001 through AC-025 and maps current static, runtime, evaluation, and review evidence.
It is executable implementation evidence, not a replacement for the normative
Architecture Contracts artifact.

## Repository implementation documentation

| Area                   | Guide                                                                                                     | What it establishes                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Operating rules        | [Root AGENTS.md](../../AGENTS.md)                                                                         | Status, setup, ownership, work-packet lifecycle, escalation, and completion |
| Dependency enforcement | [Architecture checker](../../architecture/README.md)                                                      | Machine-enforced package directions and public boundaries                   |
| Contract governance    | [Registry](contracts.registry.json) and [governance below](#architecture-contract-governance)             | AC evidence channels, status honesty, and contribution procedure            |
| Testing                | [Testing guide](../testing.md)                                                                            | Unit, integration, evaluation, contract, and security test separation       |
| Evaluations            | [Evaluation guide](../../evaluations/README.md)                                                           | Judgment evidence, planned/executable status, provider and cost isolation   |
| Security/environment   | [Security guide](../security/README.md) and [environment registry](../security/environment.registry.json) | Secret handling, environment vocabulary, and registered variables           |
| Database               | [Database package guide](../../packages/database/README.md)                                               | Drizzle ownership, reviewed migrations, and guarded local operations        |
| Local infrastructure   | [Infrastructure guide](../../infra/README.md)                                                             | PostgreSQL/Temporal lifecycle and local safety                              |
| Terraform              | [Terraform guide](../../infra/terraform/README.md)                                                        | Unapplied GCP skeleton, environment separation, and dev WIF bootstrap       |
| Observability          | [Observability guide](../observability.md)                                                                | Technical telemetry, correlation, privacy, and exporter boundary            |
| Promotion control      | [Promotion-control guide](../promotion-control.md)                                                        | Feature modes, Shadow side-effect boundary, and Authority separation        |
| Future ADRs            | [Future ADR index](#future-adr-index)                                                                     | Planned P0.10-T02 decision-record location                                  |

Package-level ownership and prohibited responsibilities live in each package README.
The root guide contains the compact one-line package map.

## Runtime topology and ownership

Nexus is currently a modular monolith. `apps/web`, `apps/api`, and `apps/worker` are
deployable adapter surfaces; a package boundary does not imply a microservice.

```text
apps/web ─┐
apps/api ─┼─> approved public package entry points
apps/worker┘

packages/application ─> kernel/contracts/domains/authority/audit/events
domain packages       ─> kernel/contracts/events only
adapters               ─> canonical application/public boundaries
```

One real-world thing has one canonical domain owner. Cortex owns operational
execution; Loop owns people/organizations/relationships; Axis owns commercial
progression; Signal owns marketing; Current owns finance; Edge owns derived
cross-domain intelligence without copying canonical facts.

Cross-domain behavior belongs in future application capabilities, durable events, or
workflows. Database, AI, integrations, workspaces, and apps do not become alternate
owners of domain policy. [architecture/policy.mjs](../../architecture/policy.mjs) is
the normative machine allow-list.

## Current implementation boundary

Phase 0 has engineering harnesses, smoke applications, local infrastructure,
migrations, fixtures, verification/evaluation/contract/security frameworks, CI,
unapplied Terraform, technical observability, and promotion control. Phase 1 business
objects and behavior are not implemented. Durable business events, outbox behavior,
Temporal business workflows, Authority, Alex, providers, and generated workspaces
remain future architecture.

P0.08-T02 provides the dedicated dev GitHub OIDC/WIF bootstrap and a manual,
read-only hosted identity smoke. The application environment roots remain
unapplied. P0.10-T03 still owns the first non-production deployment and its
reviewed deployment-resource IAM. Phase 0 is not complete.

## Future ADR index

P0.10-T02 owns the baseline ADRs and their index. Until that packet creates the
reviewed files, this section is the discoverable placeholder for the future location:
`docs/architecture/adrs/`. Do not create or infer ADR decisions in P0.10-T01.

## Architecture Contract governance

Architecture Contracts are non-negotiable engineering invariants derived from the Nexus v2 Foundation. They constrain implementation even when a feature appears to work. An ordinary unit-test failure means a particular implementation behavior is incorrect; a contract failure means the implementation or its evidence violates a system boundary and must not be bypassed merely to make a build green.

The normative human source is the external controlling artifact **Nexus v2 Architecture Contracts v1.0 (30 August 2026)**. The repository does not duplicate that PDF. `contracts.registry.json` mirrors its canonical IDs/titles and serves as the executable index and enforcement map. If the registry and controlling artifact conflict, the artifact controls and the discrepancy requires architecture review.

## Registry fields

The versioned JSON registry contains exactly AC-001 through AC-025. Each entry records:

- exact canonical ID and title;
- responsible architectural owner/boundary;
- primary implementation phases from the canonical application matrix;
- `static`, `runtime`, `eval`, and `review` channels;
- an explicit status, evidence IDs, and an honest reason for each channel.

Owners are Nexus subsystems or governance boundaries, never employees. `subsystem` identifies one clear architectural boundary, `cross-cutting` identifies a joint invariant, and `architecture-governed` identifies platform-wide policy. Ownership metadata does not create a production package.

Phase metadata identifies when a contract is primary:

- Phase 0 - Engineering Harness
- Phase 1 - Business Kernel
- Phase 2 - Alex and Workspace Runtime
- Phase 3 - Relationship and Execution Loop
- Phase 4 - Commercial-to-Cash Loop
- Phase 5 - Marketing and Organizational Intelligence
- Phase 6 - External Interfaces, Migration, and Hardening
- Phase 7 - Integrated Private Alpha and Beta

Phase 0 scaffolds every contract, even when only AC-021 and AC-023 are primary. Absence from an earlier primary list never means a contract does not exist. Phase 6 and Phase 7 apply all contracts.

## Channels and statuses

Channels have deliberately different meanings:

- `static`: deterministic source, structure, configuration, schema, or repository inspection;
- `runtime`: executable application, integration, database, workflow, or infrastructure behavior;
- `eval`: judgment, selection, safety, reasoning, or intelligent-behavior scenarios;
- `review`: architecture, code, schema, or security judgment that cannot be completely mechanized.

Allowed statuses are:

- `enforced`: the channel's current claim is completely backed by executable evidence;
- `partial`: concrete evidence exists but does not prove the entire contract;
- `planned`: an enforcement mechanism or scenario is defined for future implementation;
- `not_yet_executable`: the target behavior does not exist and therefore cannot pass;
- `not_applicable`: this channel is not a meaningful way to prove the contract.

Registered is never synonymous with enforced. A planned evaluation is not an enforced evaluation. A documented review requirement is not a static test. The Phase 0 registry intentionally contains substantial partial, planned, and not-yet-executable coverage.

## Evidence

The top-level evidence catalog avoids repeating paths and commands across 25 entries. Evidence kinds are:

- `path`: a repository file that must exist;
- `command`: a root package script that must exist;
- `evaluation`: a scenario ID that must exist in the evaluation catalog.

Every `enforced` or `partial` channel requires concrete evidence. Registry validation resolves every referenced path, command, and evaluation ID. A planned evaluation cannot support an `enforced` or `partial` eval claim. Evidence describes only the bounded fact it proves; for example, import checks partially support AC-003 but cannot prove arbitrary handler semantics.

Run `pnpm contracts:list` for the human matrix and channel summary. Run `pnpm contracts:list --json` for deterministic machine-readable status. Neither output contains timestamps or transient state.

## Adding contract evidence

Contract-specific executable tests use Vitest and the `.contract.test.ts` naming convention. They are explicitly discovered by the `contract-framework` Vitest project and excluded from normal unit/integration/evaluation discovery.

Declare metadata beside each future test with `defineContractTestEvidence`:

```ts
const evidence = defineContractTestEvidence({
  contractId: 'AC-004',
  evidenceType: 'runtime',
  suiteId: 'authority-adapter-parity',
  testId: 'all-adapters-use-authority',
  applicablePhase: 'phase-1',
  status: 'executable',
  description: 'Every adapter receives the same Authority decision.',
});

test(`${evidence.contractId}: ${evidence.testId}`, async () => {
  // Exercise the real application boundary; do not create evaluator-only behavior.
});
```

Future examples include AC-004 adapter parity, AC-006 outbox crash/replay, AC-008 timeout/reconciliation, and AC-014 permission-negative retrieval. Until their production targets exist, metadata may be `planned` or `not_yet_executable`, but no fake passing test may be added.

To add or strengthen evidence:

1. implement the real bounded behavior in its planned work packet;
2. add deterministic static/runtime tests or an executable evaluation as appropriate;
3. run the evidence independently;
4. add its path, command, or evaluation ID to the evidence catalog;
5. update only the supported channel status and reason;
6. run `pnpm contracts:check`, `pnpm contracts:test`, and `pnpm verify`;
7. obtain required architecture/schema/security review.

Changing `planned` to `enforced` requires proof, not optimism. Failures remain visible until the implementation or an explicitly approved canonical decision changes.

## Governance

An implementation may not weaken, remove, or relabel an Architecture Contract merely because the implementation violates it.

Changing a canonical contract requires an explicit architecture decision and an updated Architecture Contracts artifact. Do not silently edit expected behavior in the registry or a test. A necessary exception requires a bounded ADR explaining evidence, scope, risk, and whether the Foundation or canonical artifact must be amended.

`pnpm verify` validates the registry and runs contract-framework self-tests without Docker, provider credentials, model calls, or AI cost. Infrastructure-heavy future contract suites must remain explicit until their appropriate CI/runtime environment exists.
