import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { DatabaseConnection } from './client.js';

export const defaultMigrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

export interface MigrationStatus {
  readonly applied: number;
  readonly expected: number;
  readonly pending: number;
  readonly upToDate: boolean;
}

export async function applyMigrations(
  connection: DatabaseConnection,
  migrationsFolder = defaultMigrationsFolder,
): Promise<void> {
  await migrate(connection.db, {
    migrationsFolder,
    migrationsSchema: 'drizzle',
    migrationsTable: '__drizzle_migrations',
  });
}

async function expectedMigrationHashes(migrationsFolder: string): Promise<Set<string>> {
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    entries?: Array<{ tag?: string }>;
  };
  const hashes = await Promise.all(
    (journal.entries ?? []).map(async ({ tag }) => {
      if (!tag)
        throw new Error(`Migration journal ${journalPath} contains an entry without a tag.`);
      const contents = await readFile(path.join(migrationsFolder, `${tag}.sql`), 'utf8');
      return createHash('sha256').update(contents).digest('hex');
    }),
  );
  return new Set(hashes);
}

export async function readMigrationStatus(
  connection: DatabaseConnection,
  migrationsFolder = defaultMigrationsFolder,
): Promise<MigrationStatus> {
  const expected = await expectedMigrationHashes(migrationsFolder);
  const tableResult = await connection.pool.query<{ exists: boolean }>(
    "SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists",
  );
  const exists = tableResult.rows[0]?.exists === true;
  const appliedHashes = exists
    ? (
        await connection.pool.query<{ hash: string }>(
          'SELECT hash FROM drizzle.__drizzle_migrations',
        )
      ).rows.map(({ hash }) => hash)
    : [];
  const appliedExpected = appliedHashes.filter((hash) => expected.has(hash)).length;
  const pending = Math.max(0, expected.size - appliedExpected);
  return {
    applied: appliedHashes.length,
    expected: expected.size,
    pending,
    upToDate: pending === 0 && appliedHashes.length === expected.size,
  };
}

export async function listMigrationSqlFiles(
  migrationsFolder = defaultMigrationsFolder,
): Promise<readonly string[]> {
  return (await readdir(migrationsFolder)).filter((name) => name.endsWith('.sql')).sort();
}
