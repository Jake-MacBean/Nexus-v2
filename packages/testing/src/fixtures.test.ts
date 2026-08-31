import assert from 'node:assert/strict';
import test from 'node:test';

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
  assert.deepEqual(rebuilt, fixtureOrganizationAlpha);
  assert.match(
    rebuilt.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  );
  assert.match(rebuilt.domain, /\.example\.test$/u);
});

test('named user fixture is deterministic and organization scoped', () => {
  const rebuilt = userFixture({
    fixtureKey: fixtureUserAlpha.fixtureKey,
    organization: fixtureOrganizationAlpha,
    displayName: fixtureUserAlpha.displayName,
    email: fixtureUserAlpha.email,
  });
  assert.deepEqual(rebuilt, fixtureUserAlpha);
  assert.equal(rebuilt.organizationId, fixtureOrganizationAlpha.id);
  assert.equal(rebuilt.organizationFixtureKey, fixtureOrganizationAlpha.fixtureKey);
  assert.equal(defaultFixtureSet.user.organizationId, defaultFixtureSet.organization.id);
  assert.match(rebuilt.email, /@organization-alpha\.example\.test$/u);
});

test('unique fixture variants are distinct and remain fictional', () => {
  const firstOrganization = uniqueOrganizationFixture();
  const secondOrganization = uniqueOrganizationFixture();
  const firstUser = uniqueUserFixture(firstOrganization);
  const secondUser = uniqueUserFixture(firstOrganization);
  assert.notEqual(firstOrganization.id, secondOrganization.id);
  assert.notEqual(firstUser.id, secondUser.id);
  assert.notEqual(firstUser.email, secondUser.email);
  assert.equal(firstUser.organizationId, firstOrganization.id);
  assert.match(firstOrganization.domain, /\.example\.test$/u);
  assert.match(firstUser.email, /\.example\.test$/u);
});

test('fixture safety rejects unsafe domains and secret-shaped strings', () => {
  assert.throws(
    () =>
      organizationFixture({
        fixtureKey: 'unsafe',
        name: 'Unsafe Fixture',
        slug: 'unsafe',
        domain: 'customer-domain.invalid-tld',
      }),
    /unsafe/u,
  );
  const secretShaped = `AKIA${'A'.repeat(16)}`;
  assert.throws(() => assertSafeFixtureStrings({ token: secretShaped }), /secret-shaped/u);
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
  assert.deepEqual(events, ['second', 'first']);
  assert.equal(scope.closed, true);
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
  await assert.rejects(scope.teardown(), AggregateError);
  assert.deepEqual(events, ['failing', 'later']);
});

test('a failing fixture body still runs cleanup', async () => {
  let cleaned = false;
  await assert.rejects(
    withFixtureScope(async (scope) => {
      scope.registerCleanup('failure proof', () => {
        cleaned = true;
      });
      throw new Error('simulated test failure');
    }),
    /simulated test failure/u,
  );
  assert.equal(cleaned, true);
});
