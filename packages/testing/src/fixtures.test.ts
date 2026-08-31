import { expect, test } from 'vitest';

import {
  defaultFixtureSet,
  fixtureOrganizationAlpha,
  fixtureUserAlpha,
  organizationFixture,
  uniqueOrganizationFixture,
  uniqueUserFixture,
  userFixture,
} from './descriptors.js';
import { assertSafeFixtureStrings } from './safety.js';
import { createFixtureScope, withFixtureScope } from './scope.js';

test('named organization fixture is deterministic and fictional', () => {
  const rebuilt = organizationFixture({
    fixtureKey: fixtureOrganizationAlpha.fixtureKey,
    name: fixtureOrganizationAlpha.name,
    slug: fixtureOrganizationAlpha.slug,
    domain: fixtureOrganizationAlpha.domain,
  });
  expect(rebuilt).toEqual(fixtureOrganizationAlpha);
  expect(rebuilt.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  );
  expect(rebuilt.domain).toMatch(/\.example\.test$/u);
});

test('named user fixture is deterministic and organization scoped', () => {
  const rebuilt = userFixture({
    fixtureKey: fixtureUserAlpha.fixtureKey,
    organization: fixtureOrganizationAlpha,
    displayName: fixtureUserAlpha.displayName,
    email: fixtureUserAlpha.email,
  });
  expect(rebuilt).toEqual(fixtureUserAlpha);
  expect(rebuilt.organizationId).toBe(fixtureOrganizationAlpha.id);
  expect(rebuilt.organizationFixtureKey).toBe(fixtureOrganizationAlpha.fixtureKey);
  expect(defaultFixtureSet.user.organizationId).toBe(defaultFixtureSet.organization.id);
  expect(rebuilt.email).toMatch(/@organization-alpha\.example\.test$/u);
});

test('unique fixture variants are distinct and remain fictional', () => {
  const firstOrganization = uniqueOrganizationFixture();
  const secondOrganization = uniqueOrganizationFixture();
  const firstUser = uniqueUserFixture(firstOrganization);
  const secondUser = uniqueUserFixture(firstOrganization);
  expect(firstOrganization.id).not.toBe(secondOrganization.id);
  expect(firstUser.id).not.toBe(secondUser.id);
  expect(firstUser.email).not.toBe(secondUser.email);
  expect(firstUser.organizationId).toBe(firstOrganization.id);
  expect(firstOrganization.domain).toMatch(/\.example\.test$/u);
  expect(firstUser.email).toMatch(/\.example\.test$/u);
});

test('fixture safety rejects unsafe domains and secret-shaped strings', () => {
  expect(() =>
    organizationFixture({
      fixtureKey: 'unsafe',
      name: 'Unsafe Fixture',
      slug: 'unsafe',
      domain: 'customer-domain.invalid-tld',
    }),
  ).toThrow(/unsafe/u);
  const secretShaped = `AKIA${'A'.repeat(16)}`;
  expect(() => assertSafeFixtureStrings({ token: secretShaped })).toThrow(/secret-shaped/u);
});

test('fixture scope tears down in reverse order and teardown is idempotent', async () => {
  const events: string[] = [];
  const scope = createFixtureScope();
  scope.registerCleanup('first', () => {
    events.push('first');
  });
  scope.registerCleanup('second', () => {
    events.push('second');
  });
  await scope.teardown();
  await scope.teardown();
  expect(events).toEqual(['second', 'first']);
  expect(scope.closed).toBe(true);
});

test('fixture scope attempts every cleanup and reports failures', async () => {
  const events: string[] = [];
  const scope = createFixtureScope();
  scope.registerCleanup('later', () => {
    events.push('later');
  });
  scope.registerCleanup('failing', () => {
    events.push('failing');
    throw new Error('simulated cleanup failure');
  });
  await expect(scope.teardown()).rejects.toThrow(AggregateError);
  expect(events).toEqual(['failing', 'later']);
});

test('a failing fixture body still runs cleanup', async () => {
  let cleaned = false;
  await expect(
    withFixtureScope(async (scope) => {
      scope.registerCleanup('failure proof', () => {
        cleaned = true;
      });
      throw new Error('simulated test failure');
    }),
  ).rejects.toThrow(/simulated test failure/u);
  expect(cleaned).toBe(true);
});
