export const localDatabase = Object.freeze({
  database: 'nexus_v2_dev',
  hostname: '127.0.0.1',
  password: 'nexus_v2_dev_local_only',
  port: '55432',
  user: 'nexus_v2_dev',
});

export function requireDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const value = environment.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      'DATABASE_URL is required. Copy .env.example, use the Phase 0 local PostgreSQL URL, and do not commit credentials.',
    );
  }
  return value;
}

export function assertLocalDatabaseUrl(connectionString: string): URL {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('Local database rebuild refused: DATABASE_URL is not a valid URL.');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//u, ''));
  const matches =
    (url.protocol === 'postgres:' || url.protocol === 'postgresql:') &&
    url.hostname === localDatabase.hostname &&
    url.port === localDatabase.port &&
    decodeURIComponent(url.username) === localDatabase.user &&
    decodeURIComponent(url.password) === localDatabase.password &&
    database === localDatabase.database;

  if (!matches) {
    throw new Error(
      `Local database rebuild refused: target must exactly match ${localDatabase.user}@${localDatabase.hostname}:${localDatabase.port}/${localDatabase.database} with the documented local-only password.`,
    );
  }
  return url;
}
