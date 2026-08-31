# Nexus testing guide

Vitest is the canonical runner for Nexus TypeScript and React correctness tests. Tests are colocated with the source they own so a production file and its evidence remain easy to find. A business behavior is not complete merely because its implementation works once. Its deterministic correctness evidence ships with it.

Repository bootstrap/tooling written in JavaScript or MJS may continue to use Node's built-in test runner. `architecture/checker.test.mjs` is the deliberate current exception: it tests the architecture checker without depending on the application test toolchain. This is not a second runner for TypeScript application or package code.

## Categories and discovery

| Category    | Filename                                          | Environment                                 | Normal `verify`        | Infrastructure              |
| ----------- | ------------------------------------------------- | ------------------------------------------- | ---------------------- | --------------------------- |
| Unit        | `*.test.ts`, `*.test.tsx`                         | Node for API/worker/packages; jsdom for web | Yes                    | None                        |
| Integration | `*.integration.test.ts`, `*.integration.test.tsx` | Node                                        | No                     | Explicit local dependencies |
| Evaluation  | `*.eval.test.ts`, `*.eval.test.tsx`               | Explicit evaluation-harness Vitest project  | Harness self-test only | None in Phase 0             |

Unit projects explicitly exclude integration and evaluation names. The integration project includes only integration names and excludes evaluation names. Evaluation-harness tests run only through the explicit `eval-harness` project and remain provider-free. Do not add model calls or model mocks to the correctness categories.

New unit tests under `apps/api/src`, `apps/worker/src`, `apps/web/src`, or any `packages/*/src` workspace join the appropriate suite automatically. Empty packages need no placeholder tests. Put a test beside its production module; put reusable fixture builders/fakes in `packages/testing`; keep repository-tooling tests beside their tooling.

## Commands

```shell
pnpm test                 # fast unit suite, Node plus jsdom
pnpm test:unit            # explicit unit-suite alias
pnpm test:coverage        # unit suite plus text/JSON/HTML/LCOV coverage
pnpm verify               # all fast repository gates, including unit tests
pnpm eval:self            # synthetic provider-free evaluation-harness proofs
pnpm eval                 # planned product evaluation catalog

pnpm db:local:up          # start PostgreSQL only
pnpm test:integration     # all current integration suites
pnpm db:test:integration  # focused migration lifecycle
pnpm fixtures:test:integration
pnpm infra:down
```

`test`, `test:unit`, `test:coverage`, and `verify` require neither Docker nor credentials. `test:integration` currently requires only the exact local PostgreSQL target from `.env.example`; it runs a preflight and tells the caller to run `pnpm db:local:up` when unavailable. Temporal is not required until a real workflow integration exists.

## Environments

The root `vitest.config.ts` uses Vitest's supported `projects` mechanism:

- `unit-node`: API, worker, and package tests in the Node environment.
- `unit-web`: React tests in jsdom without launching a browser.
- `integration-node`: controlled local integration tests, serialized by file for current database-reset safety.

API route tests use Fastify `inject()` and never bind a TCP port. React tests use Testing Library and stub adapters such as API health rather than changing the UI or opening a browser. Worker logic should expose small lifecycle/health functions that can be tested without leaving a server or process running.

## Network, providers, time, and randomness

Every unit test starts with a rejecting global `fetch`. A test that genuinely exercises a fetch adapter must install an explicit mock/stub; it must never reach a live provider. Use fake adapters for provider unit tests and controlled local/fake services for integration tests. No unit test may require the internet, production credentials, external AI, PostgreSQL, Temporal, or Docker.

Use `vi.useFakeTimers()`/fixed dates when wall-clock time affects behavior. Inject or fix random inputs when exact output matters; use the explicit unique factories from `@nexus-v2/testing` only when uniqueness is the subject. Do not add a production abstraction solely to make a trivial test easier.

## Fixtures and cleanup

`@nexus-v2/testing` remains the sole shared fixture system. Import it only from test/development code and reuse its deterministic descriptors, unique variants, fake-data validation, fixture scopes, and temporary PostgreSQL support. Never duplicate fixture implementations in a Vitest setup file.

Unit tests clean mocks/globals after each test. React DOM cleanup is automatic. Integration tests must close connections, remove temporary schemas/records in `finally` or `withFixtureScope`, clean up after simulated failures, reject non-local destructive targets, and leave no customer or production data. Current PostgreSQL integration files run conservatively rather than concurrently because the migration proof rebuilds the shared local database.

## Test-writing examples

Node/package behavior:

```ts
import { expect, test } from 'vitest';

test('describes the observable rule', () => {
  expect(calculateWithFixedInput()).toEqual(expectedResult);
});
```

React behavior:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

test('shows controlled adapter state', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));
  render(<Component />);
  expect(await screen.findByText('Ready')).toBeDefined();
});
```

Write specific test names, await every asynchronous assertion, and do not swallow promise rejections or console failures. Unit tests time out after five seconds; current integration tests after fifteen seconds. Fix hangs instead of extending timeouts indiscriminately.

## Coverage

`pnpm test:coverage` writes:

- terminal text and summary;
- `coverage/coverage-final.json`;
- `coverage/lcov.info`;
- browsable HTML under `coverage/`.

Coverage focuses on production TypeScript/TSX and excludes tests, generated/build output, migrations, test setup/configuration, and database tooling. No arbitrary global threshold is imposed while most packages are Phase 0 scaffolds. Thresholds should be introduced incrementally as substantive production behavior arrives; new untested behavior remains visible in the report.

## Future Codex work

For every production change:

1. Put deterministic unit evidence beside the owned source.
2. Add integration evidence only when a controlled boundary genuinely needs it.
3. Reuse `packages/testing`; do not create a second fixture system.
4. Stub providers and global fetch in unit tests.
5. Prove cleanup and local-target safety in destructive integration tests.
6. Run `pnpm test:unit`, affected integration suites, coverage when relevant, and `pnpm verify`.
