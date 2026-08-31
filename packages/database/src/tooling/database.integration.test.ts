import './load-environment.js';

import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { createDatabaseConnection } from '../client.js';
import { assertLocalDatabaseUrl, requireDatabaseUrl } from '../config.js';
import { applyMigrations, readMigrationStatus } from '../migrations.js';
import { nexusPlatformMetadata } from '../schema/index.js';
import { rebuildLocalDatabase } from './rebuild-local.js';

const localUrl = requireDatabaseUrl();
assertLocalDatabaseUrl(localUrl);

async function schemaSignature(): Promise<readonly string[]> {
  const connection = createDatabaseConnection({ connectionString: localUrl });
  try {
    const result = await connection.pool.query<{ signature: string }>(
      `SELECT concat_ws(':', column_name, data_type, is_nullable, coalesce(column_default, '')) AS signature
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nexus_platform_metadata'
       ORDER BY ordinal_position`,
    );
    return result.rows.map(({ signature }) => signature);
  } finally {
    await connection.close();
  }
}

test('configuration failures are explicit', () => {
  expect(() => requireDatabaseUrl({})).toThrow(/DATABASE_URL is required/u);
  expect(() => assertLocalDatabaseUrl('postgresql://example.invalid/production')).toThrow(
    /rebuild refused/u,
  );
});

test('unavailable database connections fail clearly', async () => {
  const connection = createDatabaseConnection({
    connectionString: 'postgresql://nexus_v2_dev:invalid@127.0.0.1:1/nexus_v2_dev',
    connectionTimeoutMillis: 250,
  });
  await expect(connection.pool.query('SELECT 1')).rejects.toThrow();
  await connection.close();
});

test('clean database migration lifecycle is repeatable', async () => {
  await rebuildLocalDatabase(localUrl);

  let connection = createDatabaseConnection({ connectionString: localUrl });
  try {
    const absent = await connection.pool.query<{ exists: boolean }>(
      "SELECT to_regclass('public.nexus_platform_metadata') IS NOT NULL AS exists",
    );
    expect(absent.rows[0]?.exists).toBe(false);

    await applyMigrations(connection);
    const firstStatus = await readMigrationStatus(connection);
    expect(firstStatus).toEqual({ applied: 1, expected: 1, pending: 0, upToDate: true });

    const columns = await connection.pool.query<{ columnName: string; isNullable: string }>(
      `SELECT column_name AS "columnName", is_nullable AS "isNullable"
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nexus_platform_metadata'
       ORDER BY ordinal_position`,
    );
    expect(columns.rows.map(({ columnName, isNullable }) => [columnName, isNullable])).toEqual([
      ['key', 'NO'],
      ['value', 'NO'],
      ['created_at', 'NO'],
      ['updated_at', 'NO'],
    ]);
    const primaryKey = await connection.pool.query<{ columnName: string }>(
      `SELECT attribute.attname AS "columnName"
       FROM pg_constraint AS constraint_definition
       JOIN pg_class AS relation ON relation.oid = constraint_definition.conrelid
       JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
       JOIN unnest(constraint_definition.conkey) AS key_number(attnum) ON true
       JOIN pg_attribute AS attribute
         ON attribute.attrelid = relation.oid AND attribute.attnum = key_number.attnum
       WHERE namespace.nspname = 'public'
         AND relation.relname = 'nexus_platform_metadata'
         AND constraint_definition.contype = 'p'`,
    );
    expect(primaryKey.rows).toEqual([{ columnName: 'key' }]);

    await connection.db.insert(nexusPlatformMetadata).values({
      key: 'phase-0-integration-test',
      value: 'ok',
    });
    const readBack = await connection.db
      .select({ key: nexusPlatformMetadata.key, value: nexusPlatformMetadata.value })
      .from(nexusPlatformMetadata)
      .where(eq(nexusPlatformMetadata.key, 'phase-0-integration-test'));
    expect(readBack).toEqual([{ key: 'phase-0-integration-test', value: 'ok' }]);

    await applyMigrations(connection);
    expect(await readMigrationStatus(connection)).toEqual(firstStatus);
    await connection.db
      .delete(nexusPlatformMetadata)
      .where(eq(nexusPlatformMetadata.key, 'phase-0-integration-test'));
  } finally {
    await connection.close();
  }

  const firstSignature = await schemaSignature();
  expect(firstSignature).toHaveLength(4);
  await rebuildLocalDatabase(localUrl);
  connection = createDatabaseConnection({ connectionString: localUrl });
  try {
    await applyMigrations(connection);
    expect(await readMigrationStatus(connection)).toEqual({
      applied: 1,
      expected: 1,
      pending: 0,
      upToDate: true,
    });
  } finally {
    await connection.close();
  }
  expect(await schemaSignature()).toEqual(firstSignature);
});
