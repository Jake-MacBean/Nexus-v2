/** Promotion state for a capability. Promotion never grants authority. */
export const promotionModes = ['disabled', 'shadow', 'enabled'] as const;

export type PromotionMode = (typeof promotionModes)[number];

/** Environments recognized by Nexus promotion control. */
export const promotionEnvironments = ['local', 'test', 'staging', 'production'] as const;

export type PromotionEnvironment = (typeof promotionEnvironments)[number];

declare const promotionOrganizationIdBrand: unique symbol;

/**
 * Opaque Phase 0 scoping value only. This is not the canonical Phase 1
 * Organization identifier or an authorization/tenancy boundary.
 */
export type PromotionOrganizationId = string & {
  readonly [promotionOrganizationIdBrand]: 'PromotionOrganizationId';
};

export interface FeatureFlagDefinition {
  readonly key: string;
  readonly description: string;
  readonly defaultMode: PromotionMode;
}

export interface FeatureFlagDefinitionInput {
  readonly key: string;
  readonly description: string;
  readonly defaultMode?: PromotionMode;
}

export interface PromotionEvaluationContext {
  readonly environment: PromotionEnvironment;
  readonly organizationId?: PromotionOrganizationId;
}

export interface PromotionModeSource {
  resolveMode(
    flag: FeatureFlagDefinition,
    context: PromotionEvaluationContext,
  ): Promise<PromotionSourceResolution | undefined>;
}

export interface PromotionSourceResolution {
  readonly mode: PromotionMode;
  readonly scope: 'organization-environment' | 'environment';
}

export interface StaticPromotionOverride {
  readonly flagKey: string;
  readonly environment: PromotionEnvironment;
  readonly mode: PromotionMode;
  readonly organizationId?: PromotionOrganizationId;
}

export type PromotionResolutionSource =
  'organization-environment-override' | 'environment-override' | 'definition-default';

export interface ResolvedPromotionMode {
  readonly mode: PromotionMode;
  readonly source: PromotionResolutionSource;
}

const FLAG_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_SCOPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const MAX_FLAG_KEY_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 512;
const MAX_ORGANIZATION_SCOPE_LENGTH = 128;

function isValidFlagKey(value: string): boolean {
  return value.length <= MAX_FLAG_KEY_LENGTH && FLAG_KEY_PATTERN.test(value);
}

function isValidOrganizationScope(value: string): boolean {
  return value.length <= MAX_ORGANIZATION_SCOPE_LENGTH && OPAQUE_SCOPE_PATTERN.test(value);
}

export function isPromotionMode(value: unknown): value is PromotionMode {
  return typeof value === 'string' && promotionModes.includes(value as PromotionMode);
}

export function isPromotionEnvironment(value: unknown): value is PromotionEnvironment {
  return typeof value === 'string' && promotionEnvironments.includes(value as PromotionEnvironment);
}

export function defineFeatureFlag(input: FeatureFlagDefinitionInput): FeatureFlagDefinition {
  if (!isValidFlagKey(input.key)) {
    throw new TypeError(
      'Feature flag keys must use lowercase dot/hyphen-separated segments and be at most 128 characters.',
    );
  }

  const description = input.description.trim();
  if (description.length === 0 || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new TypeError('Feature flag descriptions must contain 1 to 512 characters.');
  }

  if (input.defaultMode !== undefined && !isPromotionMode(input.defaultMode)) {
    throw new TypeError('Feature flag default mode is invalid.');
  }

  return Object.freeze({
    key: input.key,
    description,
    defaultMode: input.defaultMode ?? 'disabled',
  });
}

export function asPromotionOrganizationId(value: string): PromotionOrganizationId {
  if (!isValidOrganizationScope(value)) {
    throw new TypeError(
      'Promotion organization scope must be an opaque 1 to 128 character identifier.',
    );
  }

  return value as PromotionOrganizationId;
}

function overrideIdentity(override: StaticPromotionOverride): string {
  return [override.flagKey, override.environment, override.organizationId ?? '*'].join('\u0000');
}

/**
 * Deterministic Phase 0 source. It is intentionally process-local and does not
 * establish a persistence or remote-provider strategy.
 */
export class StaticPromotionModeSource implements PromotionModeSource {
  readonly #overrides: readonly StaticPromotionOverride[];

  constructor(overrides: readonly StaticPromotionOverride[] = []) {
    const identities = new Set<string>();

    for (const override of overrides) {
      if (!isValidFlagKey(override.flagKey)) {
        throw new TypeError(`Invalid feature flag key in override: ${override.flagKey}`);
      }
      if (!isPromotionEnvironment(override.environment)) {
        throw new TypeError('Invalid promotion environment in override.');
      }
      if (!isPromotionMode(override.mode)) {
        throw new TypeError('Invalid promotion mode in override.');
      }
      if (
        override.organizationId !== undefined &&
        !isValidOrganizationScope(override.organizationId)
      ) {
        throw new TypeError('Invalid organization scope in promotion override.');
      }

      const identity = overrideIdentity(override);
      if (identities.has(identity)) {
        throw new TypeError(
          `Duplicate promotion override for ${override.flagKey} in ${override.environment}.`,
        );
      }
      identities.add(identity);
    }

    this.#overrides = Object.freeze(overrides.map((override) => Object.freeze({ ...override })));
  }

  async resolveMode(
    flag: FeatureFlagDefinition,
    context: PromotionEvaluationContext,
  ): Promise<PromotionSourceResolution | undefined> {
    if (!isPromotionEnvironment(context.environment)) {
      throw new TypeError('Invalid promotion evaluation environment.');
    }
    if (context.organizationId !== undefined && !isValidOrganizationScope(context.organizationId)) {
      throw new TypeError('Invalid promotion evaluation organization scope.');
    }

    if (context.organizationId !== undefined) {
      const organizationOverride = this.#overrides.find(
        (override) =>
          override.flagKey === flag.key &&
          override.environment === context.environment &&
          override.organizationId === context.organizationId,
      );

      if (organizationOverride !== undefined) {
        return {
          mode: organizationOverride.mode,
          scope: 'organization-environment',
        };
      }
    }

    const environmentOverride = this.#overrides.find(
      (override) =>
        override.flagKey === flag.key &&
        override.environment === context.environment &&
        override.organizationId === undefined,
    );

    return environmentOverride === undefined
      ? undefined
      : { mode: environmentOverride.mode, scope: 'environment' };
  }
}

/**
 * Resolution precedence is exact organization+environment, environment, then
 * the reviewed definition default. A definition without an explicit default
 * is disabled.
 */
export async function resolvePromotionMode(
  flag: FeatureFlagDefinition,
  context: PromotionEvaluationContext,
  source: PromotionModeSource,
): Promise<ResolvedPromotionMode> {
  if (!isValidFlagKey(flag.key) || !isPromotionMode(flag.defaultMode)) {
    throw new TypeError('Invalid feature flag definition.');
  }
  if (!isPromotionEnvironment(context.environment)) {
    throw new TypeError('Invalid promotion evaluation environment.');
  }
  if (context.organizationId !== undefined && !isValidOrganizationScope(context.organizationId)) {
    throw new TypeError('Invalid promotion evaluation organization scope.');
  }

  const resolved = await source.resolveMode(flag, context);
  if (
    resolved !== undefined &&
    (!isPromotionMode(resolved.mode) ||
      (resolved.scope !== 'organization-environment' && resolved.scope !== 'environment') ||
      (resolved.scope === 'organization-environment' && context.organizationId === undefined))
  ) {
    throw new TypeError('Promotion source returned an invalid scoped mode.');
  }

  if (resolved === undefined) {
    return { mode: flag.defaultMode, source: 'definition-default' };
  }

  return {
    mode: resolved.mode,
    source:
      resolved.scope === 'organization-environment'
        ? 'organization-environment-override'
        : 'environment-override',
  };
}
