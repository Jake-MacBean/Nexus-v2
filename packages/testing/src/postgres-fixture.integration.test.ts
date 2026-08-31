import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabaseConnection, requireDatabaseUrl } from '@nexus-v2/database';

import { fixtureOrganizationAlpha, fixtureUserAlpha } from './descriptors.js';
import { createPostgresFixtureStore } from './postgres-fixture.js';
import { createFixtureScope, withFixtureScope } from './scope.js';

const localUrl = requireDatabaseUrl();

async function schemaExists(schemaName: string): Promise<boolean> {
  const connection = createDatabaseConnection({ connectionString: localUrl, max: 1 });
  try {
    const result = await connection.pool.query<{ exists: boolean }>(
      'SELECT to_regnamespace($1) IS NOT NULL AS exists',
      [schemaName],
    );
    return result.rows[0]?.exists === true;
  } finally {
    await connection.close();
  }
}

test('temporary PostgreSQL fixture state exists only within its scope', async () => {
  let schemaName = '';
  await withFixtureScope(async (scope) => {
    const store = await createPostgresFixtureStore(scope, localUrl);
    schemaName = store.schemaName;
    await store.put('organization', fixtureOrganizationAlpha);
    await store.put('user', fixtureUserAlpha);
    assert.equal(await schemaExists(schemaName), true);
    assert.deepEqual(await store.read('organization'), fixtureOrganizationAlpha);
    assert.deepEqual(await store.read('user'), fixtureUserAlpha);
  });
  assert.equal(await schemaExists(schemaName), false);
});

test('temporary PostgreSQL fixture schema is removed after a failing body', async () => {
  let schemaName = '';
  await assert.rejects(
    withFixtureScope(async (scope) => {
      const store = await createPostgresFixtureStore(scope, localUrl);
      schemaName = store.schemaName;
      await store.put('failure-proof', { state: 'temporary' });
      throw new Error('simulated integration assertion failure');
    }),
    /simulated integration assertion failure/u,
  );
  assert.equal(await schemaExists(schemaName), false);
});

test('fixture teardown is safe to rerun', async () => {
  const scope = createFixtureScope();
  const store = await createPostgresFixtureStore(scope, localUrl);
  await scope.teardown();
  await scope.teardown();
  assert.equal(await schemaExists(store.schemaName), false);
});

test('non-local PostgreSQL targets are rejected before fixture mutation', async () => {
  const scope = createFixtureScope();
  await assert.rejects(
    createPostgresFixtureStore(
      scope,
      'postgresql://nexus_v2_dev:nexus_v2_dev_local_only@example.invalid:55432/nexus_v2_dev',
    ),
    /rebuild refused/u,
  );
  await scope.teardown();
});
