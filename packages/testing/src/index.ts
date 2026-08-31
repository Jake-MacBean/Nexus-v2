/**
 * Public entry point for @nexus-v2/testing.
 *
 * Phase 0 test fixture harness only. Nothing exported here is production data
 * or a canonical Nexus domain model.
 */
export {
  defaultFixtureSet,
  fixtureOrganizationAlpha,
  fixtureUserAlpha,
  organizationFixture,
  uniqueOrganizationFixture,
  uniqueUserFixture,
  userFixture,
} from './descriptors.js';
export type {
  OrganizationFixtureDescriptor,
  OrganizationFixtureInput,
  UserFixtureDescriptor,
  UserFixtureInput,
} from './descriptors.js';
export { deterministicFixtureId } from './identifiers.js';
export { createPostgresFixtureStore } from './postgres-fixture.js';
export type { PostgresFixtureStore } from './postgres-fixture.js';
export { assertReservedFixtureDomain, assertSafeFixtureStrings } from './safety.js';
export { createFixtureScope, withFixtureScope } from './scope.js';
export type { FixtureCleanup, FixtureScope } from './scope.js';

export const packageIdentity = {
  name: '@nexus-v2/testing',
  status: 'phase-0-fixture-harness',
} as const;

export type PackageIdentity = typeof packageIdentity;
