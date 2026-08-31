export const EVALUATION_SCHEMA_VERSION = '1.0.0' as const;
export const EVALUATION_HARNESS_VERSION = '1.0.0' as const;

export const evaluationCategories = [
  'capability_selection',
  'authority',
  'permissions',
  'truth_hierarchy',
  'prompt_injection',
  'external_send_safety',
  'duplicate_side_effects',
  'financial_reasoning',
  'contract_discrepancy',
  'cross_domain_synthesis',
  'workspace_composition',
  'attention_interruption',
  'harness_self_test',
] as const;

export type EvaluationCategory = (typeof evaluationCategories)[number];

export const implementationStatuses = ['planned', 'executable', 'retired'] as const;
export type ImplementationStatus = (typeof implementationStatuses)[number];

export const evaluatorTypes = [
  'deterministic',
  'rule',
  'model_judged',
  'human_review',
  'composite',
] as const;
export type EvaluatorType = (typeof evaluatorTypes)[number];

export const evaluationOutcomes = ['PASS', 'FAIL', 'SKIPPED', 'ERROR'] as const;
export type EvaluationOutcome = (typeof evaluationOutcomes)[number];

export const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const evidenceClasses = [
  'canonical_current',
  'organizational_memory',
  'user_relationship_memory',
  'episodic_memory',
  'conversation_state',
  'external_evidence',
] as const;
export type EvidenceClass = (typeof evidenceClasses)[number];

export interface EvaluationFixtureReference {
  readonly key: string;
  readonly kind: 'organization' | 'user' | 'evidence';
  readonly source: '@nexus-v2/testing' | 'scenario';
}

export interface EvaluationEvidenceReference {
  readonly id: string;
  readonly evidenceClass: EvidenceClass;
  readonly trustedInstructionSource: boolean;
  readonly summary: string;
}

export interface EvaluationScoringMethod {
  readonly type: EvaluatorType;
  readonly evaluatorId: string;
  readonly description: string;
}

export type EvaluationPassCriteria =
  | {
      readonly kind: 'categorical';
      readonly requiredOutcome: 'PASS';
      readonly requirements: readonly string[];
    }
  | {
      readonly kind: 'minimum_score';
      readonly minimumScore: number;
      readonly requirements: readonly string[];
    };

export interface EvaluationScenario {
  readonly schemaVersion: typeof EVALUATION_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly description: string;
  readonly category: EvaluationCategory;
  readonly tags: readonly string[];
  readonly riskLevel: RiskLevel;
  readonly critical: boolean;
  readonly targetCapability: string;
  readonly prerequisites: readonly string[];
  readonly fixtures: readonly EvaluationFixtureReference[];
  readonly evidenceContext: readonly EvaluationEvidenceReference[];
  readonly input: Readonly<Record<string, unknown>>;
  readonly expectedBehavior: readonly string[];
  readonly prohibitedBehavior: readonly string[];
  readonly scoring: EvaluationScoringMethod;
  readonly passCriteria: EvaluationPassCriteria;
  readonly notesEvidence: readonly string[];
  readonly implementationStatus: ImplementationStatus;
  readonly statusReason: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean.`);
  return value;
}

function requireStringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

function requireMember<const T extends readonly string[]>(
  value: unknown,
  values: T,
  path: string,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new Error(`${path} must be one of: ${values.join(', ')}.`);
  }
  return value as T[number];
}

function parseFixtures(value: unknown): readonly EvaluationFixtureReference[] {
  if (!Array.isArray(value)) throw new Error('scenario.fixtures must be an array.');
  return value.map((item, index) => {
    const fixture = requireRecord(item, `scenario.fixtures[${index}]`);
    return {
      key: requireString(fixture.key, `scenario.fixtures[${index}].key`),
      kind: requireMember(
        fixture.kind,
        ['organization', 'user', 'evidence'] as const,
        `scenario.fixtures[${index}].kind`,
      ),
      source: requireMember(
        fixture.source,
        ['@nexus-v2/testing', 'scenario'] as const,
        `scenario.fixtures[${index}].source`,
      ),
    };
  });
}

function parseEvidence(value: unknown): readonly EvaluationEvidenceReference[] {
  if (!Array.isArray(value)) throw new Error('scenario.evidenceContext must be an array.');
  return value.map((item, index) => {
    const evidence = requireRecord(item, `scenario.evidenceContext[${index}]`);
    return {
      id: requireString(evidence.id, `scenario.evidenceContext[${index}].id`),
      evidenceClass: requireMember(
        evidence.evidenceClass,
        evidenceClasses,
        `scenario.evidenceContext[${index}].evidenceClass`,
      ),
      trustedInstructionSource: requireBoolean(
        evidence.trustedInstructionSource,
        `scenario.evidenceContext[${index}].trustedInstructionSource`,
      ),
      summary: requireString(evidence.summary, `scenario.evidenceContext[${index}].summary`),
    };
  });
}

function parseScoring(value: unknown): EvaluationScoringMethod {
  const scoring = requireRecord(value, 'scenario.scoring');
  return {
    type: requireMember(scoring.type, evaluatorTypes, 'scenario.scoring.type'),
    evaluatorId: requireString(scoring.evaluatorId, 'scenario.scoring.evaluatorId'),
    description: requireString(scoring.description, 'scenario.scoring.description'),
  };
}

function parsePassCriteria(value: unknown): EvaluationPassCriteria {
  const criteria = requireRecord(value, 'scenario.passCriteria');
  const kind = requireMember(
    criteria.kind,
    ['categorical', 'minimum_score'] as const,
    'scenario.passCriteria.kind',
  );
  const requirements = requireStringArray(
    criteria.requirements,
    'scenario.passCriteria.requirements',
  );
  if (kind === 'categorical') {
    if (criteria.requiredOutcome !== 'PASS') {
      throw new Error('scenario.passCriteria.requiredOutcome must be PASS.');
    }
    return { kind, requiredOutcome: 'PASS', requirements };
  }
  if (
    typeof criteria.minimumScore !== 'number' ||
    !Number.isFinite(criteria.minimumScore) ||
    criteria.minimumScore < 0 ||
    criteria.minimumScore > 1
  ) {
    throw new Error('scenario.passCriteria.minimumScore must be between 0 and 1.');
  }
  return { kind, minimumScore: criteria.minimumScore, requirements };
}

export function parseEvaluationOutcome(value: unknown): EvaluationOutcome {
  return requireMember(value, evaluationOutcomes, 'outcome');
}

export function parseEvaluationScenario(value: unknown): EvaluationScenario {
  const scenario = requireRecord(value, 'scenario');
  if (scenario.schemaVersion !== EVALUATION_SCHEMA_VERSION) {
    throw new Error(`scenario.schemaVersion must be ${EVALUATION_SCHEMA_VERSION}.`);
  }
  const id = requireString(scenario.id, 'scenario.id');
  if (!/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(id)) {
    throw new Error('scenario.id must be a stable lowercase dotted or kebab identifier.');
  }
  if (!Number.isSafeInteger(scenario.version) || Number(scenario.version) < 1) {
    throw new Error('scenario.version must be a positive integer.');
  }
  const implementationStatus = requireMember(
    scenario.implementationStatus,
    implementationStatuses,
    'scenario.implementationStatus',
  );
  const statusReason = requireString(scenario.statusReason, 'scenario.statusReason');
  if (implementationStatus === 'planned' && !/^NOT IMPLEMENTED:/u.test(statusReason)) {
    throw new Error('A planned scenario statusReason must begin with "NOT IMPLEMENTED:".');
  }

  return {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    id,
    version: Number(scenario.version),
    title: requireString(scenario.title, 'scenario.title'),
    description: requireString(scenario.description, 'scenario.description'),
    category: requireMember(scenario.category, evaluationCategories, 'scenario.category'),
    tags: requireStringArray(scenario.tags, 'scenario.tags'),
    riskLevel: requireMember(scenario.riskLevel, riskLevels, 'scenario.riskLevel'),
    critical: requireBoolean(scenario.critical, 'scenario.critical'),
    targetCapability: requireString(scenario.targetCapability, 'scenario.targetCapability'),
    prerequisites: requireStringArray(scenario.prerequisites, 'scenario.prerequisites'),
    fixtures: parseFixtures(scenario.fixtures),
    evidenceContext: parseEvidence(scenario.evidenceContext),
    input: requireRecord(scenario.input, 'scenario.input'),
    expectedBehavior: requireStringArray(scenario.expectedBehavior, 'scenario.expectedBehavior'),
    prohibitedBehavior: requireStringArray(
      scenario.prohibitedBehavior,
      'scenario.prohibitedBehavior',
    ),
    scoring: parseScoring(scenario.scoring),
    passCriteria: parsePassCriteria(scenario.passCriteria),
    notesEvidence: requireStringArray(scenario.notesEvidence, 'scenario.notesEvidence'),
    implementationStatus,
    statusReason,
  };
}

export function validateScenarioCatalog(values: readonly unknown[]): readonly EvaluationScenario[] {
  const scenarios = values.map(parseEvaluationScenario);
  const seen = new Set<string>();
  for (const scenario of scenarios) {
    const identity = `${scenario.id}@${scenario.version}`;
    if (seen.has(identity)) throw new Error(`Duplicate evaluation scenario ${identity}.`);
    seen.add(identity);
  }
  return scenarios;
}
