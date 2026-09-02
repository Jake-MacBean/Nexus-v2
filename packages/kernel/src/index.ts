/**
 * Public entry point for @nexus-v2/kernel.
 *
 * Phase 0 architecture scaffold only. No substantive Nexus behavior belongs in
 * this package until an approved work packet introduces it.
 */
export const packageIdentity = {
  name: '@nexus-v2/kernel',
  status: 'scaffold',
} as const;

export type PackageIdentity = typeof packageIdentity;

export {
  asPromotionOrganizationId,
  defineFeatureFlag,
  isPromotionEnvironment,
  isPromotionMode,
  promotionEnvironments,
  promotionModes,
  resolvePromotionMode,
  StaticPromotionModeSource,
} from './promotion-control.js';
export type {
  FeatureFlagDefinition,
  FeatureFlagDefinitionInput,
  PromotionEnvironment,
  PromotionEvaluationContext,
  PromotionMode,
  PromotionModeSource,
  PromotionOrganizationId,
  PromotionResolutionSource,
  PromotionSourceResolution,
  ResolvedPromotionMode,
  StaticPromotionOverride,
} from './promotion-control.js';
