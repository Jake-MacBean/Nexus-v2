export const canonicalContractTitles = {
  'AC-001': 'Organization and Tenancy Boundary',
  'AC-002': 'Canonical Identity and Domain Ownership',
  'AC-003': 'Commands and Queries Are Canonical Application Capabilities',
  'AC-004': 'Central Authority Enforcement',
  'AC-005': 'Consequential Decisions and Actions Are Reconstructable',
  'AC-006': 'Business Events Are Durable and Transactional',
  'AC-007': 'Workflows Own Durable Execution State',
  'AC-008': 'External Side Effects Are Idempotent and Reconcilable',
  'AC-009': 'AI Tools Are Adapters, Not Business Logic',
  'AC-010': 'Model Gateway Isolates Provider Choice',
  'AC-011': 'Context Is Assembled, Not Dumped',
  'AC-012': 'Canonical Truth Outranks Memory',
  'AC-013': 'Capability Exposure Is Minimal and Relevant',
  'AC-014': 'Knowledge Retrieval Is Permission-Aware Before Model Access',
  'AC-015': 'Integrations Are Provider Adapters',
  'AC-016': 'External Clients Are Portals, Not Nexus Replacements',
  'AC-017': 'Generated Workspaces Are Structured Specifications',
  'AC-018': 'Visual Grammar Is Versioned and Compatible',
  'AC-019': 'Attention Is Separate From Activity',
  'AC-020':
    'Business Audit, AI Activity, Provider Traces, and Technical Observability Stay Distinct',
  'AC-021': 'Environment and Secret Isolation',
  'AC-022': 'Migration Preserves Provenance and Is Repeatable',
  'AC-023': 'Repository Must Be Agent-Legible',
  'AC-024': 'Tiering Does Not Fork the Product',
  'AC-025': 'AI Economics Are Measured Internally',
} as const;

export type ContractId = keyof typeof canonicalContractTitles;

export const phaseDefinitions = {
  'phase-0': 'Engineering Harness',
  'phase-1': 'Business Kernel',
  'phase-2': 'Alex and Workspace Runtime',
  'phase-3': 'Relationship and Execution Loop',
  'phase-4': 'Commercial-to-Cash Loop',
  'phase-5': 'Marketing and Organizational Intelligence',
  'phase-6': 'External Interfaces, Migration, and Hardening',
  'phase-7': 'Integrated Private Alpha and Beta',
} as const;

export type PhaseId = keyof typeof phaseDefinitions;

export const canonicalPrimaryPhases: Readonly<Record<ContractId, readonly PhaseId[]>> = {
  'AC-001': ['phase-1', 'phase-3', 'phase-4', 'phase-6', 'phase-7'],
  'AC-002': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-003': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-004': ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-005': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-006': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-007': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-008': ['phase-1', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-009': ['phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-010': ['phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-011': ['phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-012': ['phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-013': ['phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-014': ['phase-3', 'phase-4', 'phase-6', 'phase-7'],
  'AC-015': ['phase-3', 'phase-4', 'phase-6', 'phase-7'],
  'AC-016': ['phase-6', 'phase-7'],
  'AC-017': ['phase-2', 'phase-5', 'phase-6', 'phase-7'],
  'AC-018': ['phase-2', 'phase-5', 'phase-6', 'phase-7'],
  'AC-019': ['phase-2', 'phase-3', 'phase-5', 'phase-6', 'phase-7'],
  'AC-020': ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
  'AC-021': ['phase-0', 'phase-1', 'phase-3', 'phase-4', 'phase-6', 'phase-7'],
  'AC-022': ['phase-3', 'phase-4', 'phase-6', 'phase-7'],
  'AC-023': [
    'phase-0',
    'phase-1',
    'phase-2',
    'phase-3',
    'phase-4',
    'phase-5',
    'phase-6',
    'phase-7',
  ],
  'AC-024': ['phase-5', 'phase-6', 'phase-7'],
  'AC-025': ['phase-2', 'phase-4', 'phase-5', 'phase-6', 'phase-7'],
};

export const enforcementChannels = ['static', 'runtime', 'eval', 'review'] as const;
export type EnforcementChannel = (typeof enforcementChannels)[number];

export const enforcementStatuses = [
  'enforced',
  'partial',
  'planned',
  'not_yet_executable',
  'not_applicable',
] as const;
export type EnforcementStatus = (typeof enforcementStatuses)[number];

export const ownerKinds = ['subsystem', 'cross-cutting', 'architecture-governed'] as const;
export type OwnerKind = (typeof ownerKinds)[number];

export const evidenceKinds = ['path', 'command', 'evaluation'] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];

export interface EvidenceDefinition {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly reference: string;
  readonly description: string;
}

export interface ChannelEnforcement {
  readonly status: EnforcementStatus;
  readonly evidence: readonly string[];
  readonly reason: string;
}

export interface ContractRegistryEntry {
  readonly id: ContractId;
  readonly title: string;
  readonly owner: { readonly kind: OwnerKind; readonly boundary: string };
  readonly primaryPhases: readonly PhaseId[];
  readonly enforcement: Readonly<Record<EnforcementChannel, ChannelEnforcement>>;
}

export interface ContractRegistry {
  readonly schemaVersion: 1;
  readonly canonicalSource: {
    readonly title: 'Nexus v2 Architecture Contracts';
    readonly version: '1.0';
    readonly reference: string;
    readonly normative: true;
  };
  readonly phases: readonly { readonly id: PhaseId; readonly title: string }[];
  readonly evidenceCatalog: readonly EvidenceDefinition[];
  readonly contracts: readonly ContractRegistryEntry[];
}
