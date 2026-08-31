# Nexus evaluation guide

Nexus tests prove deterministic code correctness and controlled infrastructure collaboration. Evaluations measure whether a reasoning capability makes the correct, safe, grounded, economically appropriate, and useful judgment across a reviewable scenario. The Phase 0 harness builds that evidence system; it does not implement Alex or claim that future behavior works.

Version control is the evaluation source of truth during development. No evaluation database or management product exists.

## Architecture

`evaluations/` is repository-owned engineering evidence outside product packages:

- `schemas/` owns the versioned scenario contract and runtime validation.
- `scenarios/planned.ts` owns the future Nexus behavior catalog.
- `scenarios/harness-self.ts` owns isolated synthetic mechanics proofs.
- `evaluators/` defines provider-neutral contracts; it contains no business logic or provider adapter.
- `runners/` owns stable discovery, filtering, execution, outcomes, and aggregation.
- `reporting/` owns human and JSON representations.
- `baselines/` owns deliberately versioned synthetic regression fixtures and comparison.
- `results/` is ignored transient output from local runs.

Pinned Node 24 executes erasable TypeScript directly. `evaluations/tsconfig.json` applies the repository's strict TypeScript rules, and the root build/typecheck gates include it. The harness adds no runtime or provider dependency.

## Scenario contract

Every scenario declares schema version, stable ID, scenario version, title, description, category, tags, risk level, criticality, target capability, prerequisites, fixture/evidence context, input, expected and prohibited observable behavior, evaluator type and ID, pass criteria, notes/evidence, implementation status, and an explicit status reason.

The runtime parser rejects unknown category/status/outcome values, unsafe IDs, invalid versions/scores, malformed fields, duplicate ID/version pairs, and planned scenarios whose reason does not begin with `NOT IMPLEMENTED:`. A scenario remains understandable in review without execution.

Canonical categories are:

- `capability_selection`
- `authority`
- `permissions`
- `truth_hierarchy`
- `prompt_injection`
- `external_send_safety`
- `duplicate_side_effects`
- `financial_reasoning`
- `contract_discrepancy`
- `cross_domain_synthesis`
- `workspace_composition`
- `attention_interruption`
- `harness_self_test`, reserved for synthetic mechanics evidence

Adding a category requires an explicit registry/schema version change and review. Do not create ad hoc category strings.

## Status and outcomes

Scenario implementation status is `planned`, `executable`, or `retired`. Evaluation outcome is `PASS`, `FAIL`, `SKIPPED`, or `ERROR`.

- Planned means its target capability does not exist. It is always reported `SKIPPED` with `NOT IMPLEMENTED`, never run and never counted as passing.
- Executable means the real target capability and evaluator are available. Missing or broken evaluator infrastructure is `ERROR`, not behavioral `FAIL`.
- Retired scenarios remain visible with a retirement rationale and are reported `SKIPPED`.
- `FAIL` means an executable target violated expected behavior.
- `ERROR` means the evaluator could not produce a valid judgment.

If no executable scenario runs, suite outcome is `SKIPPED`, not a fictional pass. Planned/retired scenarios are excluded from the pass-rate denominator but remain visible in terminal and JSON output.

## Evaluator and safety model

The schema supports:

- deterministic evaluation for exact values, shapes, selected Commands, provenance, and side-effect counts;
- rule/assertion evaluation for permissions, approval, prohibited actions, and grounding;
- future provider-neutral model judgment;
- future human review for tone, relational quality, interruption usefulness, or complex strategy;
- future composite evaluation where categorical safety assertions remain independently visible.

Only deterministic and rule/assertion synthetic evaluators exist now. Model/human/composite interfaces describe observable inputs and outputs; they do not call a provider or implement business behavior.

Safety results must distinguish allowed execution, safe refusal, `approval_required`, `clarification_required`, `denied`, and `human_only` as appropriate. “Always refuse” is not a safety policy. Critical scenarios are explicit; a critical `FAIL` or `ERROR` fails the suite regardless of any average score.

Authority scenarios should eventually provide organization policy, user role/permission, standing autonomy, risk, reversibility, action scope, initiator, and requested action, then inspect decisions such as `allowed`, `approval_required`, `denied`, or `human_only`. The evaluator must observe the real Authority Engine; it must not recreate that engine.

Prompt-injection scenarios label trusted instruction sources separately from untrusted external content. Open-world content cannot grant authority. Evaluation inspects observable selected tools/actions and side effects, not merely whether a response warns about injection.

Truth scenarios distinguish canonical current facts, organizational memory, user relationship memory, episodic memory, conversation state, and external evidence. Canonical truth outranks memory.

## Fixtures

Identity references use the canonical `organization-alpha` and `user-alpha` keys from `@nexus-v2/testing`. Scenarios may add fictional evidence descriptions but must not copy domain schemas or create a second Organization/User fixture system. Scenario evidence is review input, not canonical business implementation.

## Commands

```shell
pnpm eval          # run the planned product catalog; all Phase 0 entries visibly skip
pnpm eval:self     # run synthetic mechanics assertions and their Vitest tests
pnpm eval:list     # list all product scenarios and statuses
pnpm eval:report   # write evaluations/results/latest.json and print the summary
pnpm eval:baseline # prove synthetic regression/improvement comparison
```

`eval` and `eval:list` accept repeatable `--category <id>` and `--tag <tag>` filters. Scenario ordering is always stable by ID/version.

`pnpm verify` runs only provider-free harness self-tests. It never runs a live model. AI evaluation cost must be intentional and observable. A future live command must use an explicit profile, explicit environment configuration, and report provider/model/token/cost metadata. It must never be folded silently into `verify`.

## Reports and baselines

Each JSON report includes run ID, timestamp, harness/schema version, suite, scenario ID/version, category, implementation status, outcome, score, critical flag, reason, evaluator, duration, evidence, and provider/cost metadata. Reports preserve observable evidence and safe judge rationale, never chain-of-thought or private model reasoning.

Terminal summaries show executable, passed, failed, errored, skipped-planned, critical-failure, pass-rate, provider-call, cost, and category counts. Transient reports are ignored. Do not commit run IDs or timestamps.

The committed `baselines/harness-self.v1.json` is synthetic harness evidence only—not an Alex production baseline. Comparison normalizes away run ID, timestamp, and duration, then identifies newly failed, newly passing, changed-score, missing, and critical-regression scenarios. Critical regressions block regardless of aggregate scores.

## Governance and extension

Scenario IDs are permanent. Increment the scenario version when expected behavior materially changes. Do not silently rewrite historical expectations to erase a regression. Retirement requires a reviewable reason. Criticality and evaluator type are explicit, and expected/prohibited behavior must remain reviewable.

A capability may not delete or weaken an evaluation merely because the implementation fails it. Changing expected behavior requires an explicit product/architecture decision and review.

When Phase 1 or Phase 2 creates a target capability:

1. exercise the real application/Authority/domain boundary; never build evaluator-only shadow behavior;
2. add controlled fixture or adapter evidence without production/customer data;
3. register the appropriate deterministic/rule evaluator first where possible;
4. change the scenario to `executable`, incrementing its version if expectations changed;
5. prove expected and prohibited observable actions, provenance, cleanup, and critical behavior;
6. run the affected suite and baseline comparison;
7. update an accepted baseline only through explicit review.

A failing evaluation blocks a build when it belongs to the invoked required suite. Any critical failure blocks regardless of score. Planned scenarios do not block until the target capability is deliberately made executable, but they remain visible so missing coverage cannot masquerade as success.
