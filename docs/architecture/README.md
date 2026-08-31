# Nexus Architecture Contract governance

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
