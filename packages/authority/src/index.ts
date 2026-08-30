/**
 * Public entry point for @nexus-v2/authority.
 *
 * Phase 0 architecture scaffold only. No substantive Nexus behavior belongs in
 * this package until an approved work packet introduces it.
 */
export const packageIdentity = {
  name: '@nexus-v2/authority',
  status: 'scaffold',
} as const;

export type PackageIdentity = typeof packageIdentity;
