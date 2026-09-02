# Promotion control and Shadow Mode

## Purpose

Nexus promotion control stages risky or autonomous code safely before real business
capabilities exist. It answers one engineering question: should this capability be
disabled, evaluated in Shadow Mode, or eligible to continue through its normal
execution path?

> **ENABLED IS NOT AUTHORIZED.**

> **Shadow Mode may compute and record proposed behavior. It must not cross the
> external side-effect boundary.**

> **Feature flags control promotion. Authority controls permission to act.**

Promotion control is not a substitute for Authority, user permissions, commercial
entitlements, approval, risk assessment, or policy.

## Ownership

- `packages/kernel` owns domain-neutral flag definitions, environment and opaque
  organization scope, source contracts, static resolution, and precedence.
- `packages/application` owns controlled proposal/record/executor orchestration and
  the provider-neutral Shadow recorder boundary.

Kernel does not depend on application. Neither implementation depends on domains,
database, AI, integrations, workflows, observability, or an external provider.

## Flag definitions and naming

Declare stable lowercase keys with dot- or hyphen-separated segments, such as a
future `connector.new-behavior`. Definitions include a concise engineering purpose
and may explicitly select a reviewed default. Omitting the default fails closed to
`disabled`.

Do not declare permanent flags for capabilities that do not exist. Phase 0 smoke
flags live only in tests.

## Modes

| Mode       | Proposer | Shadow recorder | Executor | Meaning                                                 |
| ---------- | -------: | --------------: | -------: | ------------------------------------------------------- |
| `disabled` |       No |              No |       No | Stop before proposal computation.                       |
| `shadow`   |     Once |            Once |    Never | Compute and retain engineering evidence only.           |
| `enabled`  |     Once |              No |     Once | Invoke the supplied executor; normal gates still apply. |

The result explicitly reports `disabled`, `shadowed`, or `executed`, plus whether the
executor ran. `executed` describes callback invocation and is not an Authority result.

## Evaluation context and precedence

The environment vocabulary is `local`, `test`, `staging`, and `production`.
Evaluation accepts an optional opaque organization scope. That string exists only to
prove organization-aware resolution; it does not define the Phase 1 Organization
entity, canonical identity, tenancy, or access boundary.

Resolution is deterministic:

1. exact flag + organization + environment override;
2. exact flag + environment override;
3. reviewed definition default;
4. when no explicit definition default was supplied, `disabled`.

An override never crosses an environment or organization boundary. Staging cannot
promote production, and one organization cannot promote another.

## Proposal and side-effect boundary

Future capabilities adopt the pattern by:

1. defining or receiving a typed flag;
2. resolving it with the current environment and optional organization scope;
3. placing deterministic, side-effect-free planning in `propose`;
4. placing every external mutation behind `execute`;
5. supplying a Shadow recorder;
6. proving Shadow Mode invokes `propose` but never `execute`;
7. retaining all applicable Authority and permission checks when enabled.

The proposer may build safe intended-operation metadata. It must not send, publish,
charge, mutate external systems, or invoke an irreversible provider operation.

## Shadow observations

A Shadow observation contains:

- flag key and `shadow` mode;
- environment and optional opaque organization scope;
- technical capability identifier;
- structured proposal;
- `proposal-recorded` outcome;
- optional correlation reference;
- clock-supplied timestamp.

Record only safe engineering evidence. Never record secrets, credentials, private
reasoning, authorization headers, arbitrary business payloads, or complete model
prompts/responses.

The Phase 0 in-memory recorder is deterministic and non-persistent. It creates no
database row, event, audit record, AI Activity entry, notification, or attention item.

## Fail-closed behavior

- Missing configuration uses the definition default, which is `disabled` unless
  deliberately specified otherwise.
- Source failure or invalid source output throws before proposal or execution.
- Proposal failure throws before recording or execution.
- Shadow recording failure throws and never falls through to enabled execution.
- Executor failures propagate normally; promotion control does not invent rollback of
  an already performed action.

At this layer, rollback means changing promotion from `enabled` to `shadow` or
`disabled`, or from `shadow` to `disabled`. It is not a compensating business
transaction.

## Conceptual separation

| Concept           | Question answered                                        |
| ----------------- | -------------------------------------------------------- |
| Promotion control | Has this implementation been promoted to run?            |
| Authority         | May this specific consequential action proceed?          |
| Permission        | What may this human access or do?                        |
| Entitlement       | What does the organization's commercial plan include?    |
| Attention         | Does a situation warrant responsibility or interruption? |

A feature flag grants none of the other four. Shadow observations remain engineering
evidence and never create attention or notifications automatically.

## Testing

`pnpm test:unit` and `pnpm verify` cover the pattern. The test-only synthetic
capability proves all three modes, exact invocation counts, deterministic clocks,
organization/environment isolation, source/proposal/recorder failure safety, and the
absence of Authority or attention results. Tests use no database, Docker, cloud,
provider, network, or real organization data.

Any future staged capability must add tests proving:

- disabled invokes neither proposer nor executor;
- shadow records exactly once and never invokes the executor;
- enabled invokes the executor exactly once;
- every failure path remains fail closed;
- environment and organization overrides remain isolated.

## Future provider or persistence

`PromotionModeSource` can later support reviewed database or remote provider adapters,
and `ShadowRecorder` can later gain a reviewed durable destination. Those decisions
must wait for real Organization, Authority, privacy, operational, and retention needs.
Do not add one environment variable per flag or bypass these interfaces.
