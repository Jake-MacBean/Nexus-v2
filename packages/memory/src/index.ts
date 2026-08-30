/**
 * Public entry point for @nexus-v2/memory.
 *
 * Phase 0 architecture scaffold only. No substantive Nexus behavior belongs in
 * this package until an approved work packet introduces it.
 */
export const packageIdentity = {
  name: '@nexus-v2/memory',
  status: 'scaffold',
} as const;

export type PackageIdentity = typeof packageIdentity;
