# Architecture boundary enforcement

`architecture/policy.mjs` is the single, human-readable allow-list for Nexus
workspace dependencies. The checker discovers current workspaces and their
package names from `apps/*/package.json` and `packages/*/package.json`; package
names and source paths are not duplicated in the checker.

## Commands

- `pnpm architecture:check` parses every TypeScript/TSX module under each
  workspace's `src` directory and validates the real source-import graph.
- `pnpm architecture:test` runs isolated positive and negative fixtures for the
  checker. Fixtures use temporary repositories and never add fake imports to
  production packages.
- `pnpm verify` runs both commands automatically.

Failures identify the importing workspace and file, the imported package or
path, and the violated rule. Fix a failure by removing the prohibited coupling,
moving cross-domain orchestration to `application`, `events`, or `workflows`, or
importing an approved package through its `@nexus-v2/<package>` root entry point.
Do not add an allow-list edge simply to make verification pass; dependency
policy changes require architecture review.

## Encoded rules

- Packages never depend on deployable apps, and apps never depend on each other.
- Cross-workspace source imports use registered `@nexus-v2/<package>` root entry
  points. Relative cross-workspace imports and package subpath/deep imports fail.
- Every Nexus source import must be declared in the importing manifest, and
  every declared Nexus dependency must resolve to a discovered workspace.
- Domain packages may depend only on `kernel`, `contracts`, and `events`; direct
  domain-to-domain and adapter dependencies are prohibited.
- Package-specific allow-lists encode the dependency direction documented by
  the package READMEs, including the separation of `audit` and `observability`.
- `ai` cannot depend on `database`; business mutations must enter through future
  canonical `application` capabilities.
- Production package source cannot import `testing`. A package may declare
  `testing` only as a development dependency for tests outside production
  `src`.
- Circular production package dependencies are prohibited.
- Nexus packages expose only their deliberate root export.

These checks enforce dependency structure. Semantic rules—such as whether a
small neutral package has accumulated feature behavior or whether code is truly
business audit rather than technical telemetry—still require code review and
future purpose-built static rules because imports alone cannot prove intent.

The Architecture Contract framework complements these dependency checks with a
machine-readable AC-001 through AC-025 registry, explicit owners, phase
applicability, and honest static/runtime/evaluation/review evidence states. See
`docs/architecture/README.md` for the governance and contribution workflow, and
run `pnpm contracts:list` to inspect current coverage.
