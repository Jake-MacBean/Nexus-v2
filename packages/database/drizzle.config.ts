import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '../../.env', quiet: true });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error(
    'DATABASE_URL is required for Drizzle commands. Use the local URL from .env.example; never commit credentials.',
  );
}

export default defineConfig({
  dbCredentials: { url },
  dialect: 'postgresql',
  migrations: { schema: 'drizzle', table: '__drizzle_migrations' },
  out: './drizzle',
  schema: './src/schema/index.ts',
  strict: true,
  verbose: true,
});
