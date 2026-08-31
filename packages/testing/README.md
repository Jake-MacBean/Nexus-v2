# `@nexus-v2/testing`

Status: Phase 0 deterministic fixture harness. Everything exported here is test-only support, never production seed data or a canonical Nexus model.

Vitest is the repository's canonical TypeScript/React runner. This package remains the sole shared fixture system; it does not own runner configuration or duplicate test setup. See `docs/testing.md` at the repository root for unit/integration/evaluation discovery, Node/jsdom environments, network isolation, commands, and coverage.

## Fixture inventory

- `fixtureOrganizationAlpha`: stable organization-shaped test descriptor using `organization-alpha.example.test`.
- `fixtureUserAlpha`: stable user-shaped test descriptor related to `fixtureOrganizationAlpha` by both fixture key and UUID.
- `defaultFixtureSet`: the two named descriptors as one frozen composition.
- `organizationFixture` and `userFixture`: deterministic builders for explicitly named inputs.
- `uniqueOrganizationFixture` and `uniqueUserFixture`: random UUID variants for tests that require distinct records.

Organization and User are descriptors only. They are not domain entities, database schemas, tenancy behavior, roles, permissions, authentication identities, or a promise about the eventual production contract.

## Deterministic identifiers

Named builders derive RFC 4122 version-5 UUIDs from a fixed fixture-only namespace plus the descriptor kind and lowercase fixture key. The same kind, key, and input data therefore produces the same descriptor. The namespace begins `f17e...` and is documented solely as a debugging convention; it does not provide collision isolation from production. Environment and future organization boundaries provide actual isolation.

Use deterministic descriptors for repeatable scenarios and snapshots. Use unique variants only when a test specifically needs distinct state. Unique variants use random UUIDs and append a random token to their fictional names, keys, slugs, domains, and emails.

## Fake-data safety

- Use obvious labels such as `Fixture Organization Alpha` and `Fixture User Alpha`.
- Domains and emails must use reserved `example`/`test` forms.
- Never use real people, customers, client domains, phone numbers, production financial values, Nexus v1 data, credentials, or secret-shaped placeholders.
- Builders reject non-reserved domains and common credential/token shapes.
- Fixture keys contain only lowercase letters, digits, and hyphens.

Fixtures are controlled test inputs. They must never become startup seeds, migrations, demo tenants, hidden defaults, or shared-environment data.

## Setup and teardown

`withFixtureScope` is the preferred lifecycle boundary:

```ts
await withFixtureScope(async (scope) => {
  const resource = await createTemporaryResource();
  scope.registerCleanup('remove temporary resource', () => resource.remove());
  // Arrange and assert while the resource exists.
});
```

Cleanup runs in reverse registration order, attempts every registered operation, and reports aggregate failures. Cleanup runs even when the body throws. Direct users of `createFixtureScope` must call `teardown()` in `finally`; repeated teardown is a safe no-op. Registration after teardown is rejected.

## PostgreSQL integration fixtures

`createPostgresFixtureStore` creates a uniquely named `nexus_fixture_*` schema with one generic JSON test-state table. The schema is not in Drizzle definitions, migrations, or canonical exports. Scope teardown drops it with `CASCADE` and closes its explicit database connection.

The helper reuses `@nexus-v2/database` public lifecycle and local-target validation. It accepts only the exact P0.03/P0.04 loopback database configuration and rejects remote or alternate targets before mutation. It never writes to `nexus_platform_metadata`. Run:

```shell
pnpm db:local:up
pnpm fixtures:test:integration
pnpm infra:down
```

The integration command reads `DATABASE_URL` from the current environment or the untracked repository-root `.env`. Temporary schemas are unique per scope, but tests sharing other resources must still design their own parallel-safe isolation; no global concurrency lock is provided in Phase 0.

## Future extension rule

When Phase 1 introduces a production object, its schema and business definition belong to the owning domain package and approved database mapping. Its fixture builder belongs here and must consume that production public contract rather than duplicating types, validation, enums, authority rules, or invariants. Fixtures must not become shadow domain models.

Production source remains prohibited from importing `@nexus-v2/testing`. The architecture checker enforces that boundary. Test consumers import only the package root; deep imports remain prohibited.
