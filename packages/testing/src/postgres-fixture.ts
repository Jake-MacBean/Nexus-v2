import { randomUUID } from 'node:crypto';

import {
  assertLocalDatabaseUrl,
  createDatabaseConnection,
  type DatabaseConnection,
} from '@nexus-v2/database';

import type { FixtureScope } from './scope.js';

export interface PostgresFixtureStore {
  readonly schemaName: string;
  put(key: string, value: unknown): Promise<void>;
  read(key: string): Promise<unknown>;
}

function fixtureSchemaName(): string {
  return `nexus_fixture_${process.pid}_${randomUUID().replaceAll('-', '')}`;
}

function quotedFixtureSchema(schemaName: string): string {
  if (!/^nexus_fixture_[0-9]+_[a-f0-9]{32}$/u.test(schemaName)) {
    throw new Error('Refusing unsafe test fixture schema identifier.');
  }
  return `"${schemaName}"`;
}

async function removeFixtureSchema(
  connection: DatabaseConnection,
  schemaName: string,
): Promise<void> {
  await connection.pool.query(`DROP SCHEMA IF EXISTS ${quotedFixtureSchema(schemaName)} CASCADE`);
}

export async function createPostgresFixtureStore(
  scope: FixtureScope,
  connectionString: string,
): Promise<PostgresFixtureStore> {
  assertLocalDatabaseUrl(connectionString);
  const connection = createDatabaseConnection({ connectionString, max: 1 });
  const schemaName = fixtureSchemaName();
  const schema = quotedFixtureSchema(schemaName);
  try {
    await connection.pool.query(`CREATE SCHEMA ${schema}`);
    await connection.pool.query(
      `CREATE TABLE ${schema}.fixture_state (fixture_key text PRIMARY KEY, fixture_value jsonb NOT NULL)`,
    );
  } catch (error) {
    try {
      await removeFixtureSchema(connection, schemaName);
    } finally {
      await connection.close();
    }
    throw error;
  }

  scope.registerCleanup(`drop PostgreSQL fixture schema ${schemaName}`, async () => {
    try {
      await removeFixtureSchema(connection, schemaName);
    } finally {
      await connection.close();
    }
  });

  return Object.freeze({
    schemaName,
    async put(key: string, value: unknown) {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new Error('PostgreSQL fixture values must be JSON-serializable.');
      }
      await connection.pool.query(
        `INSERT INTO ${schema}.fixture_state (fixture_key, fixture_value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (fixture_key) DO UPDATE SET fixture_value = EXCLUDED.fixture_value`,
        [key, serialized],
      );
    },
    async read(key: string) {
      const result = await connection.pool.query<{ fixtureValue: unknown }>(
        `SELECT fixture_value AS "fixtureValue" FROM ${schema}.fixture_state WHERE fixture_key = $1`,
        [key],
      );
      return result.rows[0]?.fixtureValue;
    },
  });
}
