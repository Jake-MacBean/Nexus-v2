/**
 * Public entry point for @nexus-v2/database.
 *
 * Phase 0 database harness only. No substantive Nexus behavior belongs here.
 */
export { createDatabaseConnection } from './client.js';
export type { Database, DatabaseConnection, DatabaseConnectionOptions } from './client.js';
export { assertLocalDatabaseUrl, localDatabase, requireDatabaseUrl } from './config.js';
export {
  applyMigrations,
  defaultMigrationsFolder,
  listMigrationSqlFiles,
  readMigrationStatus,
} from './migrations.js';
export type { MigrationStatus } from './migrations.js';
export { nexusPlatformMetadata } from './schema/index.js';

export const packageIdentity = {
  name: '@nexus-v2/database',
  status: 'phase-0-harness',
} as const;

export type PackageIdentity = typeof packageIdentity;
