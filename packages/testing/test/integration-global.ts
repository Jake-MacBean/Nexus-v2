import {
  assertLocalDatabaseUrl,
  createDatabaseConnection,
  requireDatabaseUrl,
} from '@nexus-v2/database';

export default async function integrationGlobalSetup(): Promise<void> {
  let connectionString: string;
  try {
    connectionString = requireDatabaseUrl();
    assertLocalDatabaseUrl(connectionString);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PostgreSQL integration prerequisite is invalid. Export the local DATABASE_URL from .env.example and run \`pnpm db:local:up\`. ${detail}`,
      { cause: error },
    );
  }

  const connection = createDatabaseConnection({
    connectionString,
    connectionTimeoutMillis: 1_000,
    max: 1,
  });
  try {
    await connection.pool.query('SELECT 1');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local PostgreSQL is unavailable. Run \`pnpm db:local:up\` before \`pnpm test:integration\`. ${detail}`,
      { cause: error },
    );
  } finally {
    await connection.close();
  }
}
