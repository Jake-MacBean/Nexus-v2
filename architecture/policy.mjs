export const nexusScope = '@nexus-v2/';

export const domainPackageIds = Object.freeze([
  'cortex',
  'loop',
  'axis',
  'signal',
  'current',
  'edge',
]);

const domains = domainPackageIds;

/**
 * Nexus workspace dependency policy.
 *
 * Keys are workspace directory names. Values are the only Nexus packages that
 * production source in that workspace may import through a package's public
 * root entry point. External npm dependencies and same-workspace relative
 * imports are outside this package-boundary policy.
 */
export const architecturePolicy = Object.freeze({
  apps: Object.freeze({
    web: Object.freeze(['kernel', 'contracts', 'application', 'workspaces', 'observability']),
    api: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'database',
      'authority',
      'audit',
      'events',
      'integrations',
      'ai',
      'memory',
      'workspaces',
      'observability',
    ]),
    worker: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'database',
      'authority',
      'audit',
      'events',
      'workflows',
      'integrations',
      'ai',
      'memory',
      'observability',
    ]),
  }),
  packages: Object.freeze({
    kernel: Object.freeze([]),
    contracts: Object.freeze(['kernel']),
    audit: Object.freeze(['kernel', 'contracts']),
    authority: Object.freeze(['kernel', 'contracts', 'audit']),
    observability: Object.freeze(['kernel']),
    events: Object.freeze(['kernel', 'contracts', 'audit', 'observability']),
    cortex: Object.freeze(['kernel', 'contracts', 'events']),
    loop: Object.freeze(['kernel', 'contracts', 'events']),
    axis: Object.freeze(['kernel', 'contracts', 'events']),
    signal: Object.freeze(['kernel', 'contracts', 'events']),
    current: Object.freeze(['kernel', 'contracts', 'events']),
    edge: Object.freeze(['kernel', 'contracts', 'events']),
    application: Object.freeze(['kernel', 'contracts', ...domains, 'authority', 'audit', 'events']),
    database: Object.freeze(['kernel', 'contracts', ...domains, 'observability']),
    memory: Object.freeze(['kernel', 'contracts', 'observability']),
    integrations: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'authority',
      'audit',
      'events',
      'observability',
    ]),
    workflows: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'authority',
      'audit',
      'events',
      'observability',
    ]),
    ai: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'authority',
      'audit',
      'memory',
      'observability',
    ]),
    workspaces: Object.freeze(['kernel', 'contracts', 'application']),
    testing: Object.freeze([
      'kernel',
      'contracts',
      'application',
      'database',
      'authority',
      'audit',
      'events',
      'workflows',
      'integrations',
      'ai',
      'memory',
      'workspaces',
      'observability',
      ...domains,
    ]),
  }),
});
