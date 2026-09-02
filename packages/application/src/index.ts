/**
 * Public entry point for @nexus-v2/application.
 *
 * Phase 0 architecture scaffold only. No substantive Nexus behavior belongs in
 * this package until an approved work packet introduces it.
 */
export const packageIdentity = {
  name: '@nexus-v2/application',
  status: 'scaffold',
} as const;

export type PackageIdentity = typeof packageIdentity;

export {
  InMemoryShadowRecorder,
  PromotionResolutionError,
  ProposalGenerationError,
  runControlledCapability,
  ShadowRecordingError,
} from './promotion-control.js';
export type {
  ControlledCapabilityOptions,
  ControlledCapabilityResult,
  DisabledPromotionResult,
  ExecutedPromotionResult,
  PromotionClock,
  PromotionProposal,
  PromotionProposalValue,
  ShadowedPromotionResult,
  ShadowRecord,
  ShadowRecorder,
} from './promotion-control.js';
