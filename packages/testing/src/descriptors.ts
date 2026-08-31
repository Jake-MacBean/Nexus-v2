import { randomUUID } from 'node:crypto';

import { assertFixtureKey, deterministicFixtureId, uniqueFixtureToken } from './identifiers.js';
import { assertReservedFixtureDomain, assertSafeFixtureStrings } from './safety.js';

export interface OrganizationFixtureDescriptor {
  readonly fixtureKey: string;
  readonly fixtureKind: 'organization';
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly domain: string;
}

export interface UserFixtureDescriptor {
  readonly fixtureKey: string;
  readonly fixtureKind: 'user';
  readonly id: string;
  readonly organizationFixtureKey: string;
  readonly organizationId: string;
  readonly displayName: string;
  readonly email: string;
}

export interface OrganizationFixtureInput {
  readonly fixtureKey: string;
  readonly name: string;
  readonly slug: string;
  readonly domain: string;
}

export interface UserFixtureInput {
  readonly fixtureKey: string;
  readonly organization: OrganizationFixtureDescriptor;
  readonly displayName: string;
  readonly email: string;
}

export function organizationFixture(
  input: OrganizationFixtureInput,
): OrganizationFixtureDescriptor {
  assertFixtureKey(input.fixtureKey);
  assertReservedFixtureDomain(input.domain);
  assertSafeFixtureStrings({ name: input.name, slug: input.slug, domain: input.domain });
  return Object.freeze({
    fixtureKey: input.fixtureKey,
    fixtureKind: 'organization',
    id: deterministicFixtureId('organization', input.fixtureKey),
    name: input.name,
    slug: input.slug,
    domain: input.domain,
  });
}

export function userFixture(input: UserFixtureInput): UserFixtureDescriptor {
  assertFixtureKey(input.fixtureKey);
  const emailDomain = input.email.split('@')[1];
  if (!emailDomain) throw new Error(`Fixture email "${input.email}" is invalid.`);
  assertReservedFixtureDomain(emailDomain);
  assertSafeFixtureStrings({ displayName: input.displayName, email: input.email });
  return Object.freeze({
    fixtureKey: input.fixtureKey,
    fixtureKind: 'user',
    id: deterministicFixtureId('user', input.fixtureKey),
    organizationFixtureKey: input.organization.fixtureKey,
    organizationId: input.organization.id,
    displayName: input.displayName,
    email: input.email,
  });
}

export const fixtureOrganizationAlpha = organizationFixture({
  fixtureKey: 'organization-alpha',
  name: 'Fixture Organization Alpha',
  slug: 'fixture-organization-alpha',
  domain: 'organization-alpha.example.test',
});

export const fixtureUserAlpha = userFixture({
  fixtureKey: 'user-alpha',
  organization: fixtureOrganizationAlpha,
  displayName: 'Fixture User Alpha',
  email: 'user-alpha@organization-alpha.example.test',
});

export const defaultFixtureSet = Object.freeze({
  organization: fixtureOrganizationAlpha,
  user: fixtureUserAlpha,
});

export function uniqueOrganizationFixture(
  base: OrganizationFixtureDescriptor = fixtureOrganizationAlpha,
): OrganizationFixtureDescriptor {
  const token = uniqueFixtureToken();
  const fixtureKey = `organization-${token}`;
  const fixture = organizationFixture({
    fixtureKey,
    name: `${base.name} Variant ${token}`,
    slug: `fixture-organization-${token}`,
    domain: `${fixtureKey}.example.test`,
  });
  return Object.freeze({ ...fixture, id: randomUUID() });
}

export function uniqueUserFixture(
  organization: OrganizationFixtureDescriptor = fixtureOrganizationAlpha,
): UserFixtureDescriptor {
  const token = uniqueFixtureToken();
  const fixtureKey = `user-${token}`;
  const fixture = userFixture({
    fixtureKey,
    organization,
    displayName: `Fixture User Variant ${token}`,
    email: `${fixtureKey}@${organization.domain}`,
  });
  return Object.freeze({ ...fixture, id: randomUUID() });
}
