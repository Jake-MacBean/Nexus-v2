import {
  resolvePromotionMode,
  type FeatureFlagDefinition,
  type PromotionEvaluationContext,
  type PromotionModeSource,
  type PromotionResolutionSource,
} from '@nexus-v2/kernel';

export type PromotionProposalValue =
  | boolean
  | number
  | string
  | null
  | readonly PromotionProposalValue[]
  | { readonly [key: string]: PromotionProposalValue };

export type PromotionProposal = Readonly<Record<string, PromotionProposalValue>>;

export interface ShadowRecord<TProposal extends PromotionProposal = PromotionProposal> {
  readonly flagKey: string;
  readonly mode: 'shadow';
  readonly environment: PromotionEvaluationContext['environment'];
  readonly organizationId?: string;
  readonly capabilityId: string;
  readonly proposal: TProposal;
  readonly outcome: 'proposal-recorded';
  readonly correlationReference?: string;
  readonly recordedAt: string;
}

export interface ShadowRecorder<TProposal extends PromotionProposal = PromotionProposal> {
  record(observation: ShadowRecord<TProposal>): Promise<void>;
}

export interface PromotionClock {
  now(): Date;
}

export interface ControlledCapabilityOptions<
  TProposal extends PromotionProposal,
  TExecutionResult,
> {
  readonly flag: FeatureFlagDefinition;
  readonly context: PromotionEvaluationContext;
  readonly source: PromotionModeSource;
  readonly capabilityId: string;
  /** Must compute a proposal without crossing an external side-effect boundary. */
  readonly propose: () => TProposal | Promise<TProposal>;
  /** The only callback in this abstraction allowed to represent an external effect. */
  readonly execute: (proposal: TProposal) => TExecutionResult | Promise<TExecutionResult>;
  readonly shadowRecorder: ShadowRecorder<TProposal>;
  readonly correlationReference?: string;
  readonly clock?: PromotionClock;
}

interface PromotionResultBase {
  readonly flagKey: string;
  readonly resolutionSource: PromotionResolutionSource;
}

export interface DisabledPromotionResult extends PromotionResultBase {
  readonly status: 'disabled';
  readonly mode: 'disabled';
  readonly sideEffectExecuted: false;
}

export interface ShadowedPromotionResult<
  TProposal extends PromotionProposal,
> extends PromotionResultBase {
  readonly status: 'shadowed';
  readonly mode: 'shadow';
  readonly sideEffectExecuted: false;
  readonly proposal: TProposal;
  readonly observation: ShadowRecord<TProposal>;
}

export interface ExecutedPromotionResult<TExecutionResult> extends PromotionResultBase {
  /** Means the supplied executor ran; it is not an Authority decision. */
  readonly status: 'executed';
  readonly mode: 'enabled';
  readonly sideEffectExecuted: true;
  readonly executionResult: TExecutionResult;
}

export type ControlledCapabilityResult<TProposal extends PromotionProposal, TExecutionResult> =
  | DisabledPromotionResult
  | ShadowedPromotionResult<TProposal>
  | ExecutedPromotionResult<TExecutionResult>;

export class PromotionResolutionError extends Error {
  constructor(flagKey: string, cause: unknown) {
    super(`Promotion mode resolution failed closed for ${flagKey}.`, { cause });
    this.name = 'PromotionResolutionError';
  }
}

export class ProposalGenerationError extends Error {
  constructor(capabilityId: string, cause: unknown) {
    super(`Proposal generation failed for ${capabilityId}.`, { cause });
    this.name = 'ProposalGenerationError';
  }
}

export class ShadowRecordingError extends Error {
  constructor(capabilityId: string, cause: unknown) {
    super(`Shadow observation recording failed closed for ${capabilityId}.`, { cause });
    this.name = 'ShadowRecordingError';
  }
}

export class InMemoryShadowRecorder<
  TProposal extends PromotionProposal = PromotionProposal,
> implements ShadowRecorder<TProposal> {
  readonly #records: ShadowRecord<TProposal>[] = [];

  async record(observation: ShadowRecord<TProposal>): Promise<void> {
    this.#records.push(structuredClone(observation));
  }

  records(): readonly ShadowRecord<TProposal>[] {
    return structuredClone(this.#records);
  }
}

const systemClock: PromotionClock = {
  now: () => new Date(),
};

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function assertSafeReference(value: string, label: string): void {
  if (value.length > 128 || !SAFE_REFERENCE_PATTERN.test(value)) {
    throw new TypeError(`${label} must be an opaque 1 to 128 character technical identifier.`);
  }
}

function createShadowRecord<TProposal extends PromotionProposal>(
  options: ControlledCapabilityOptions<TProposal, unknown>,
  proposal: TProposal,
): ShadowRecord<TProposal> {
  const base = {
    flagKey: options.flag.key,
    mode: 'shadow' as const,
    environment: options.context.environment,
    capabilityId: options.capabilityId,
    proposal,
    outcome: 'proposal-recorded' as const,
    recordedAt: (options.clock ?? systemClock).now().toISOString(),
  };

  return {
    ...base,
    ...(options.context.organizationId === undefined
      ? {}
      : { organizationId: options.context.organizationId }),
    ...(options.correlationReference === undefined
      ? {}
      : { correlationReference: options.correlationReference }),
  };
}

/**
 * Runs promotion control around a side-effect-free proposer and an explicit
 * executor boundary. ENABLED IS NOT AUTHORIZED; all future authority and
 * permission checks remain the caller's responsibility.
 */
export async function runControlledCapability<
  TProposal extends PromotionProposal,
  TExecutionResult,
>(
  options: ControlledCapabilityOptions<TProposal, TExecutionResult>,
): Promise<ControlledCapabilityResult<TProposal, TExecutionResult>> {
  assertSafeReference(options.capabilityId, 'Capability identifier');
  if (options.correlationReference !== undefined) {
    assertSafeReference(options.correlationReference, 'Correlation reference');
  }

  let resolution;
  try {
    resolution = await resolvePromotionMode(options.flag, options.context, options.source);
  } catch (cause) {
    throw new PromotionResolutionError(options.flag.key, cause);
  }

  if (resolution.mode === 'disabled') {
    return {
      status: 'disabled',
      mode: 'disabled',
      flagKey: options.flag.key,
      resolutionSource: resolution.source,
      sideEffectExecuted: false,
    };
  }

  let proposal: TProposal;
  try {
    proposal = await options.propose();
  } catch (cause) {
    throw new ProposalGenerationError(options.capabilityId, cause);
  }

  if (resolution.mode === 'shadow') {
    const observation = createShadowRecord(options, proposal);

    try {
      await options.shadowRecorder.record(observation);
    } catch (cause) {
      throw new ShadowRecordingError(options.capabilityId, cause);
    }

    return {
      status: 'shadowed',
      mode: 'shadow',
      flagKey: options.flag.key,
      resolutionSource: resolution.source,
      sideEffectExecuted: false,
      proposal,
      observation,
    };
  }

  const executionResult = await options.execute(proposal);
  return {
    status: 'executed',
    mode: 'enabled',
    flagKey: options.flag.key,
    resolutionSource: resolution.source,
    sideEffectExecuted: true,
    executionResult,
  };
}
