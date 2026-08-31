import type { EvaluatorRegistry } from '../evaluators/contracts.ts';
import {
  EVALUATION_SCHEMA_VERSION,
  type EvaluationOutcome,
  type EvaluationScenario,
} from '../schemas/scenario.ts';

export interface HarnessSelfScenario {
  readonly scenario: EvaluationScenario;
  readonly expectedOutcome: EvaluationOutcome;
}

function selfScenario(
  id: string,
  evaluatorId: string,
  options: {
    readonly critical?: boolean;
    readonly expectedOutcome: EvaluationOutcome;
    readonly minimumScore?: number;
    readonly status?: 'planned' | 'executable';
    readonly tags?: readonly string[];
    readonly evaluatorType?: 'deterministic' | 'rule';
  },
): HarnessSelfScenario {
  const status = options.status ?? 'executable';
  return {
    expectedOutcome: options.expectedOutcome,
    scenario: {
      schemaVersion: EVALUATION_SCHEMA_VERSION,
      id,
      version: 1,
      title: `Synthetic harness proof: ${id}`,
      description:
        'Synthetic engineering evidence for evaluation-harness mechanics; not a Nexus product-behavior claim.',
      category: 'harness_self_test',
      tags: ['synthetic', 'harness-self', ...(options.tags ?? [])],
      riskLevel: options.critical ? 'critical' : 'low',
      critical: options.critical ?? false,
      targetCapability: 'evaluation-harness',
      prerequisites: [],
      fixtures: [],
      evidenceContext: [],
      input: { synthetic: true },
      expectedBehavior: ['Produce the synthetic outcome expected by the outer harness assertion.'],
      prohibitedBehavior: ['Represent this result as Nexus product capability evidence.'],
      scoring: {
        type: options.evaluatorType ?? 'deterministic',
        evaluatorId,
        description: 'Synthetic evaluator used only to prove harness mechanics.',
      },
      passCriteria:
        options.minimumScore === undefined
          ? {
              kind: 'categorical',
              requiredOutcome: 'PASS',
              requirements: ['Observed outcome equals the self-test expectation.'],
            }
          : {
              kind: 'minimum_score',
              minimumScore: options.minimumScore,
              requirements: ['Synthetic normalized score meets the threshold.'],
            },
      notesEvidence: ['This scenario is isolated from the planned Nexus behavior catalog.'],
      implementationStatus: status,
      statusReason:
        status === 'planned'
          ? 'NOT IMPLEMENTED: Synthetic planned handling proof.'
          : 'Executable provider-free harness self-test.',
    },
  };
}

export const harnessSelfScenarios = [
  selfScenario('harness.pass', 'harness.pass', { expectedOutcome: 'PASS' }),
  selfScenario('harness.fail', 'harness.fail', { expectedOutcome: 'FAIL' }),
  selfScenario('harness.critical-fail', 'harness.fail', {
    critical: true,
    expectedOutcome: 'FAIL',
  }),
  selfScenario('harness.planned-skip', 'harness.not-called', {
    expectedOutcome: 'SKIPPED',
    status: 'planned',
  }),
  selfScenario('harness.error', 'harness.error', { expectedOutcome: 'ERROR' }),
  selfScenario('harness.numeric-pass', 'harness.numeric-pass', {
    expectedOutcome: 'PASS',
    minimumScore: 0.7,
    tags: ['numeric'],
  }),
  selfScenario('harness.rule-pass', 'harness.rule-pass', {
    evaluatorType: 'rule',
    expectedOutcome: 'PASS',
    tags: ['rule'],
  }),
] as const;

export const harnessSelfEvaluatorRegistry: EvaluatorRegistry = {
  'harness.pass': () => ({ outcome: 'PASS', score: 1, reason: 'Synthetic pass.' }),
  'harness.fail': () => ({ outcome: 'FAIL', score: 0, reason: 'Synthetic intentional failure.' }),
  'harness.error': () => {
    throw new Error('Synthetic evaluator error.');
  },
  'harness.numeric-pass': () => ({
    outcome: 'PASS',
    score: 0.75,
    reason: 'Synthetic numeric score meets its threshold.',
  }),
  'harness.rule-pass': () => ({
    outcome: 'PASS',
    reason: 'Synthetic rule assertion passed.',
    evidence: ['observable-rule=true'],
  }),
  'harness.not-called': () => {
    throw new Error('A planned scenario evaluator must never run.');
  },
};
