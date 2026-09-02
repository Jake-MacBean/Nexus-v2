import { describe, expect, it } from 'vitest';

import {
  asPromotionOrganizationId,
  defineFeatureFlag,
  resolvePromotionMode,
  StaticPromotionModeSource,
} from './promotion-control.js';

const flag = defineFeatureFlag({
  key: 'phase0.smoke',
  description: 'Test-only promotion-control capability.',
});

describe('feature flag definitions', () => {
  it('fails closed when no default is explicitly configured', () => {
    expect(flag.defaultMode).toBe('disabled');
  });

  it('enforces stable keys and opaque organization scope values', () => {
    expect(() => defineFeatureFlag({ key: 'Not Valid', description: 'invalid' })).toThrow(/keys/u);
    expect(() => asPromotionOrganizationId('organization with spaces')).toThrow(/opaque/u);
  });
});

describe('static promotion source', () => {
  const organizationA = asPromotionOrganizationId('synthetic-org-a');
  const organizationB = asPromotionOrganizationId('synthetic-org-b');
  const source = new StaticPromotionModeSource([
    { flagKey: flag.key, environment: 'local', mode: 'shadow' },
    { flagKey: flag.key, environment: 'production', mode: 'disabled' },
    {
      flagKey: flag.key,
      environment: 'local',
      organizationId: organizationA,
      mode: 'enabled',
    },
  ]);

  it('uses exact organization and environment before environment and default', async () => {
    await expect(
      resolvePromotionMode(flag, { environment: 'local', organizationId: organizationA }, source),
    ).resolves.toEqual({
      mode: 'enabled',
      source: 'organization-environment-override',
    });
    await expect(
      resolvePromotionMode(flag, { environment: 'local', organizationId: organizationB }, source),
    ).resolves.toEqual({ mode: 'shadow', source: 'environment-override' });
  });

  it('isolates environments and organizations', async () => {
    await expect(
      resolvePromotionMode(
        flag,
        { environment: 'production', organizationId: organizationA },
        source,
      ),
    ).resolves.toEqual({ mode: 'disabled', source: 'environment-override' });
    await expect(
      resolvePromotionMode(flag, { environment: 'test', organizationId: organizationA }, source),
    ).resolves.toEqual({ mode: 'disabled', source: 'definition-default' });
  });

  it('returns the same resolution for the same inputs', async () => {
    const context = { environment: 'local', organizationId: organizationA } as const;
    const first = await resolvePromotionMode(flag, context, source);
    const second = await resolvePromotionMode(flag, context, source);

    expect(second).toEqual(first);
  });

  it('rejects ambiguous duplicate overrides', () => {
    expect(
      () =>
        new StaticPromotionModeSource([
          { flagKey: flag.key, environment: 'test', mode: 'disabled' },
          { flagKey: flag.key, environment: 'test', mode: 'enabled' },
        ]),
    ).toThrow(/Duplicate/u);
  });
});
