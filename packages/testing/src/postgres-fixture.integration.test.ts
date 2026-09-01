import { expect, test } from 'vitest';

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
    expect(await schemaExists(schemaName)).toBe(true);
    expect(await store.read('organization')).toEqual(fixtureOrganizationAlpha);
    expect(await store.read('user')).toEqual(fixtureUserAlpha);
  });
  expect(await schemaExists(schemaName)).toBe(false);
});

test('temporary PostgreSQL fixture schema is removed after a failing body', async () => {
  let schemaName = '';
  await expect(
    withFixtureScope(async (scope) => {
      const store = await createPostgresFixtureStore(scope, localUrl);
      schemaName = store.schemaName;
      await store.put('failure-proof', { state: 'temporary' });
      throw new Error('simulated integration assertion failure');
    }),
  ).rejects.toThrow(/simulated integration assertion failure/u);
  expect(await schemaExists(schemaName)).toBe(false);
});

test('fixture teardown is safe to rerun', async () => {
  const scope = createFixtureScope();
  const store = await createPostgresFixtureStore(scope, localUrl);
  await scope.teardown();
  await scope.teardown();
  expect(await schemaExists(store.schemaName)).toBe(false);
});

test('non-local PostgreSQL targets are rejected before fixture mutation', async () => {
  const scope = createFixtureScope();
  const remoteTarget = new URL(localUrl);
  remoteTarget.hostname = 'example.invalid';
  await expect(createPostgresFixtureStore(scope, remoteTarget.toString())).rejects.toThrow(
    /rebuild refused/u,
  );
  await scope.teardown();
});
