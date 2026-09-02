import { describe, expect, it, vi } from 'vitest';

import {
  asPromotionOrganizationId,
  defineFeatureFlag,
  StaticPromotionModeSource,
  type FeatureFlagDefinition,
  type PromotionModeSource,
} from '@nexus-v2/kernel';

import {
  InMemoryShadowRecorder,
  PromotionResolutionError,
  ProposalGenerationError,
  runControlledCapability,
  ShadowRecordingError,
  type PromotionProposal,
  type ShadowRecorder,
} from './promotion-control.js';

interface SmokeProposal extends PromotionProposal {
  readonly operation: 'phase0-smoke';
  readonly value: 'synthetic';
}

const smokeFlag = defineFeatureFlag({
  key: 'phase0.smoke',
  description: 'Test-only promotion control smoke capability.',
});
const proposal: SmokeProposal = { operation: 'phase0-smoke', value: 'synthetic' };
const context = {
  environment: 'test',
  organizationId: asPromotionOrganizationId('synthetic-org-a'),
} as const;

function sourceFor(mode: 'disabled' | 'shadow' | 'enabled'): StaticPromotionModeSource {
  return new StaticPromotionModeSource([
    {
      flagKey: smokeFlag.key,
      environment: context.environment,
      organizationId: context.organizationId,
      mode,
    },
  ]);
}

function createHarness(source: PromotionModeSource) {
  const propose = vi.fn(() => proposal);
  const execute = vi.fn(() => ({ counter: 1 }));
  const shadowRecorder = new InMemoryShadowRecorder<SmokeProposal>();

  return {
    execute,
    propose,
    shadowRecorder,
    run: () =>
      runControlledCapability({
        flag: smokeFlag,
        context,
        source,
        capabilityId: 'phase0-smoke',
        correlationReference: 'synthetic-correlation',
        propose,
        execute,
        shadowRecorder,
        clock: { now: () => new Date('2026-08-30T00:00:00.000Z') },
      }),
  };
}

describe('promotion-control dummy smoke capability', () => {
  it('does no work when disabled', async () => {
    const harness = createHarness(sourceFor('disabled'));

    await expect(harness.run()).resolves.toMatchObject({
      status: 'disabled',
      sideEffectExecuted: false,
    });
    expect(harness.propose).not.toHaveBeenCalled();
    expect(harness.execute).not.toHaveBeenCalled();
    expect(harness.shadowRecorder.records()).toHaveLength(0);
  });

  it('records exactly one proposal and never executes in shadow mode', async () => {
    const harness = createHarness(sourceFor('shadow'));

    await expect(harness.run()).resolves.toMatchObject({
      status: 'shadowed',
      sideEffectExecuted: false,
      proposal,
    });
    expect(harness.propose).toHaveBeenCalledTimes(1);
    expect(harness.execute).not.toHaveBeenCalled();
    expect(harness.shadowRecorder.records()).toEqual([
      {
        flagKey: smokeFlag.key,
        mode: 'shadow',
        environment: 'test',
        organizationId: 'synthetic-org-a',
        capabilityId: 'phase0-smoke',
        proposal,
        outcome: 'proposal-recorded',
        correlationReference: 'synthetic-correlation',
        recordedAt: '2026-08-30T00:00:00.000Z',
      },
    ]);
  });

  it('invokes the executor exactly once only when enabled', async () => {
    const harness = createHarness(sourceFor('enabled'));

    await expect(harness.run()).resolves.toMatchObject({
      status: 'executed',
      sideEffectExecuted: true,
      executionResult: { counter: 1 },
    });
    expect(harness.propose).toHaveBeenCalledTimes(1);
    expect(harness.execute).toHaveBeenCalledTimes(1);
    expect(harness.shadowRecorder.records()).toHaveLength(0);
  });
});

describe('promotion-control fail-closed behavior', () => {
  it('does not execute after proposal failure', async () => {
    const harness = createHarness(sourceFor('enabled'));
    harness.propose.mockImplementation(() => {
      throw new Error('synthetic proposal failure');
    });

    await expect(harness.run()).rejects.toBeInstanceOf(ProposalGenerationError);
    expect(harness.execute).not.toHaveBeenCalled();
    expect(harness.shadowRecorder.records()).toHaveLength(0);
  });

  it('does not execute after recorder failure', async () => {
    const execute = vi.fn();
    const failingRecorder: ShadowRecorder<SmokeProposal> = {
      record: async () => {
        throw new Error('synthetic recorder failure');
      },
    };

    await expect(
      runControlledCapability({
        flag: smokeFlag,
        context,
        source: sourceFor('shadow'),
        capabilityId: 'phase0-smoke',
        propose: () => proposal,
        execute,
        shadowRecorder: failingRecorder,
      }),
    ).rejects.toBeInstanceOf(ShadowRecordingError);
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not propose or execute after source-resolution failure', async () => {
    const source: PromotionModeSource = {
      resolveMode: async () => {
        throw new Error('synthetic source failure');
      },
    };
    const harness = createHarness(source);

    await expect(harness.run()).rejects.toBeInstanceOf(PromotionResolutionError);
    expect(harness.propose).not.toHaveBeenCalled();
    expect(harness.execute).not.toHaveBeenCalled();
  });

  it('rejects an invalid provider result rather than inferring enabled', async () => {
    const source: PromotionModeSource = {
      resolveMode: async () =>
        ({ mode: 'unexpected', scope: 'environment' }) as unknown as Awaited<
          ReturnType<PromotionModeSource['resolveMode']>
        >,
    };
    const harness = createHarness(source);

    await expect(harness.run()).rejects.toBeInstanceOf(PromotionResolutionError);
    expect(harness.propose).not.toHaveBeenCalled();
    expect(harness.execute).not.toHaveBeenCalled();
  });

  it('rejects an invalid definition default rather than falling through to execution', async () => {
    const execute = vi.fn();
    const invalidFlag = {
      ...smokeFlag,
      defaultMode: 'unexpected',
    } as unknown as FeatureFlagDefinition;

    await expect(
      runControlledCapability({
        flag: invalidFlag,
        context,
        source: new StaticPromotionModeSource(),
        capabilityId: 'phase0-smoke',
        propose: () => proposal,
        execute,
        shadowRecorder: new InMemoryShadowRecorder<SmokeProposal>(),
      }),
    ).rejects.toBeInstanceOf(PromotionResolutionError);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('promotion-control conceptual separation', () => {
  it('returns promotion evidence without authority or attention outcomes', async () => {
    const harness = createHarness(sourceFor('shadow'));
    const result = await harness.run();

    expect(result).not.toHaveProperty('authority');
    expect(result).not.toHaveProperty('permission');
    expect(result).not.toHaveProperty('entitlement');
    expect(result).not.toHaveProperty('notification');
    expect(result).not.toHaveProperty('attention');
    expect(harness.shadowRecorder.records()[0]).not.toHaveProperty('notification');
    expect(harness.shadowRecorder.records()[0]).not.toHaveProperty('attention');
  });
});
