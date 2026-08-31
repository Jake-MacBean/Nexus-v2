import './load-environment.js';

import { createDatabaseConnection } from '../client.js';
import { requireDatabaseUrl } from '../config.js';
import { applyMigrations, readMigrationStatus } from '../migrations.js';
import { rebuildLocalDatabase } from './rebuild-local.js';

async function withConnection<T>(
  connectionString: string,
  operation: (connection: ReturnType<typeof createDatabaseConnection>) => Promise<T>,
): Promise<T> {
  const connection = createDatabaseConnection({ connectionString });
  try {
    return await operation(connection);
  } finally {
    await connection.close();
  }
}

async function printStatus(connectionString: string): Promise<void> {
  await withConnection(connectionString, async (connection) => {
    const identity = await connection.pool.query<{
      database: string;
      serverVersion: string;
      user: string;
    }>(
      `SELECT current_database() AS database,
              current_user AS user,
              current_setting('server_version') AS "serverVersion"`,
    );
    const migration = await readMigrationStatus(connection);
    const metadata = await connection.pool.query<{ exists: boolean }>(
      "SELECT to_regclass('public.nexus_platform_metadata') IS NOT NULL AS exists",
    );
    const row = identity.rows[0];
    console.log(`Database: ${row?.database ?? 'unknown'} (user ${row?.user ?? 'unknown'})`);
    console.log(`PostgreSQL: ${row?.serverVersion ?? 'unknown'}`);
    console.log(
      `Migrations: ${migration.applied}/${migration.expected} applied; ${migration.pending} pending; ${migration.upToDate ? 'up to date' : 'attention required'}.`,
    );
    console.log(
      `Platform metadata table: ${metadata.rows[0]?.exists === true ? 'present' : 'absent'}.`,
    );
    if (!migration.upToDate) process.exitCode = 1;
  });
}

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!['migrate', 'rebuild', 'status'].includes(action ?? '')) {
    throw new Error('Usage: database-cli.ts <migrate|status|rebuild>');
  }
  const connectionString = requireDatabaseUrl();

  if (action === 'rebuild') {
    console.warn('DESTRUCTIVE LOCAL DATABASE REBUILD: all data in nexus_v2_dev will be removed.');
    await rebuildLocalDatabase(connectionString);
  }
  if (action === 'migrate' || action === 'rebuild') {
    await withConnection(connectionString, async (connection) => applyMigrations(connection));
    console.log('Committed migrations applied successfully.');
  }
  await printStatus(connectionString);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown database harness failure.';
  console.error(`Database command failed: ${message}`);
  process.exitCode = 1;
}
