/**
 * Public entry point for @nexus-v2/edge.
 *
 * Phase 0 architecture scaffold only. No substantive Nexus behavior belongs in
 * this package until an approved work packet introduces it.
 */
export const packageIdentity = {
  name: '@nexus-v2/edge',
  status: 'scaffold',
} as const;

export type PackageIdentity = typeof packageIdentity;
