# `@nexus-v2/database`

Status: Phase 0 database and migration harness. It contains no Nexus business schema or behavior.

## Public interface and lifecycle

`createDatabaseConnection` is the only connection factory. It returns the typed Drizzle database, the underlying `pg` pool, and an explicit asynchronous `close()` operation. Callers own every connection they create and must close it; this package deliberately has no process-global singleton.

The schema public entry point is `src/schema/index.ts`. The only current table, `nexus_platform_metadata`, is a permanent platform-owned migration sentinel with a text key/value and creation/update timestamps. It is not a surrogate business object.

## Local workflow

Copy the repository-root `.env.example` to `.env` or export `DATABASE_URL` with the documented local value, then use:

```shell
pnpm db:local:up
pnpm db:status
pnpm db:migrate
pnpm db:test:integration
pnpm db:rebuild
```

`db:local:up` starts only PostgreSQL, so database work does not require Temporal. `db:rebuild` is destructive: it accepts only the exact Phase 0 loopback host, port, database, user, and local-only password. It recreates only `nexus_v2_dev`, applies committed migrations, and reports status. It refuses every cloud, remote, alternate database, or alternate credential target.

## Migration authoring policy

1. Change an approved schema module under `src/schema`.
2. Set the local `DATABASE_URL` and run `pnpm db:generate -- --name=<descriptive_name>`.
3. Review the generated SQL and metadata under `drizzle/`. Never hide destructive SQL.
4. Run `pnpm db:check`, `pnpm db:test:integration`, and `pnpm verify`.
5. Commit the schema change, SQL migration, journal, and snapshot together.

Only reviewed, committed SQL migrations may change database structure. `drizzle-kit push` is prohibited in every environment; the repository governance gate rejects scripts that introduce it. Migration files are append-only after merge. Correct an already-shared migration with a new forward migration rather than editing its history.

Migration commands fail with a nonzero exit code when configuration, connection, validation, or application fails. Deployments and startup workflows that depend on migration success must stop on that result; they must never catch and ignore it.

`db:check` validates Drizzle migration snapshot consistency, while `database:governance` verifies the committed journal/file relationship and rejects schema-push scripts. These static checks do not compare an arbitrary live database with TypeScript schema declarations. `db:status` and the integration suite cover the live migration state; a richer source-to-live drift detector remains future work.

## Future schema ownership

Future domain tables may be added only by an approved work packet and must preserve domain ownership. A domain's schema should be located in an explicitly named module beneath `src/schema`, with database adapters mapping to that domain's public contracts. The database package must not redefine canonical Person, Organization, Opportunity, financial, campaign, or task concepts and must not embed domain policy in SQL access.

The package may depend only on the architecture policy's approved packages and external persistence libraries. Consumers import through `@nexus-v2/database`; deep imports are prohibited. Cross-domain orchestration remains in approved application capabilities, events, or workflows.

## Troubleshooting

- `DATABASE_URL is required`: create the untracked repository-root `.env` from `.env.example`, or export the variable in the current shell.
- `ECONNREFUSED`: run `pnpm db:local:up`, then confirm Docker Desktop is using Linux containers and port `55432` is available.
- `attention required` from `db:status`: review pending committed SQL, then run `pnpm db:migrate`; do not use schema push.
- Drizzle journal or snapshot errors: do not hand-edit accepted migration history. Restore the coherent committed artifacts or create a new reviewed migration from the schema definition.
- Rebuild refusal: this is an intentional safety boundary. Use only the exact local connection in `.env.example`; remote and alternate targets cannot be rebuilt by this harness.
