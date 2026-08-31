import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema/index.js';

export interface DatabaseConnectionOptions {
  readonly connectionString: string;
  readonly connectionTimeoutMillis?: number;
  readonly max?: number;
}

export function createDatabaseConnection(options: DatabaseConnectionOptions) {
  const pool = new Pool({
    connectionString: options.connectionString,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
    max: options.max ?? 10,
  });
  const db = drizzle({ client: pool, schema });

  return {
    close: async (): Promise<void> => pool.end(),
    db,
    pool,
  };
}

export type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;
export type Database = DatabaseConnection['db'];
