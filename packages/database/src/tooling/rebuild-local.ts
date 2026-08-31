import { Pool } from 'pg';

import { assertLocalDatabaseUrl, localDatabase } from '../config.js';

export async function rebuildLocalDatabase(connectionString: string): Promise<void> {
  const target = assertLocalDatabaseUrl(connectionString);
  const adminUrl = new URL(target);
  adminUrl.pathname = '/postgres';

  const pool = new Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5_000 });
  try {
    await pool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nexus_v2_dev' AND pid <> pg_backend_pid()",
    );
    await pool.query('DROP DATABASE IF EXISTS nexus_v2_dev WITH (FORCE)');
    await pool.query('CREATE DATABASE nexus_v2_dev OWNER nexus_v2_dev');
  } finally {
    await pool.end();
  }

  console.log(
    `Recreated only local database ${localDatabase.database} on ${localDatabase.hostname}:${localDatabase.port}.`,
  );
}
