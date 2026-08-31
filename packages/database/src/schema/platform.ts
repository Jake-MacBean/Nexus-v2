import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Permanent platform-owned migration sentinel. It contains no Nexus business data. */
export const nexusPlatformMetadata = pgTable('nexus_platform_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});
