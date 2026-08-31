import { randomUUID } from 'node:crypto';

import type { EvaluationExecutionMetadata, EvaluatorRegistry } from '../evaluators/contracts.ts';
import {
  EVALUATION_HARNESS_VERSION,
  EVALUATION_SCHEMA_VERSION,
  parseEvaluationOutcome,
  validateScenarioCatalog,
  type EvaluationCategory,
  type EvaluationOutcome,
  type EvaluationScenario,
} from '../schemas/scenario.ts';

export interface EvaluationFilter {
  readonly categories?: readonly EvaluationCategory[];
  readonly tags?: readonly string[];
}

export interface EvaluationResult {
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly category: EvaluationCategory;
  readonly implementationStatus: EvaluationScenario['implementationStatus'];
  readonly outcome: EvaluationOutcome;
  readonly score: number | null;
  readonly critical: boolean;
  readonly reason: string;
  readonly evaluator: string;
  readonly durationMs: number;
  readonly evidence: readonly string[];
  readonly metadata: EvaluationExecutionMetadata;
}

export interface EvaluationSummary {
  readonly total: number;
  readonly executable: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly skippedPlanned: number;
  readonly errors: number;
  readonly criticalFailures: number;
  readonly passRate: number | null;
}

export interface EvaluationReport {
  readonly runId: string;
  readonly timestamp: string;
  readonly harnessVersion: typeof EVALUATION_HARNESS_VERSION;
  readonly schemaVersion: typeof EVALUATION_SCHEMA_VERSION;
  readonly suite: string;
  readonly outcome: EvaluationOutcome;
  readonly summary: EvaluationSummary;
  readonly results: readonly EvaluationResult[];
  readonly metadata: {
    readonly providerCalls: 0;
    readonly estimatedCostUsd: 0;
  };
}

export interface EvaluationRunOptions {
  readonly suite: string;
  readonly scenarios: readonly EvaluationScenario[];
  readonly evaluators: EvaluatorRegistry;
  readonly filter?: EvaluationFilter;
  readonly now?: () => Date;
  readonly runId?: () => string;
  readonly monotonicMs?: () => number;
}

function appliesFilter(scenario: EvaluationScenario, filter: EvaluationFilter | undefined) {
  if (filter?.categories && !filter.categories.includes(scenario.category)) return false;
  if (filter?.tags && !filter.tags.every((tag) => scenario.tags.includes(tag))) return false;
  return true;
}

function stableScenarioOrder(left: EvaluationScenario, right: EvaluationScenario): number {
  return `${left.id}\0${String(left.version).padStart(8, '0')}`.localeCompare(
    `${right.id}\0${String(right.version).padStart(8, '0')}`,
  );
}

function skippedResult(scenario: EvaluationScenario): EvaluationResult {
  const prefix = scenario.implementationStatus === 'planned' ? 'NOT IMPLEMENTED' : 'RETIRED';
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    category: scenario.category,
    implementationStatus: scenario.implementationStatus,
    outcome: 'SKIPPED',
    score: null,
    critical: scenario.critical,
    reason: `${prefix}: ${scenario.statusReason.replace(/^(?:NOT IMPLEMENTED|RETIRED):\s*/u, '')}`,
    evaluator: 'not-run',
    durationMs: 0,
    evidence: [],
    metadata: offlineMetadata(),
  };
}

function offlineMetadata(): EvaluationExecutionMetadata {
  return {
    profile: 'provider-free',
    provider: null,
    model: null,
    tokenUsage: null,
    estimatedCostUsd: 0,
  };
}

function validateScore(score: number | undefined): number | null {
  if (score === undefined) return null;
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error('Evaluator score must be a number between 0 and 1.');
  }
  return score;
}

async function executeScenario(
  scenario: EvaluationScenario,
  evaluators: EvaluatorRegistry,
  monotonicMs: () => number,
): Promise<EvaluationResult> {
  const evaluator = evaluators[scenario.scoring.evaluatorId];
  if (!evaluator) {
    return {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      category: scenario.category,
      implementationStatus: scenario.implementationStatus,
      outcome: 'ERROR',
      score: null,
      critical: scenario.critical,
      reason: `Evaluator ${scenario.scoring.evaluatorId} is not registered.`,
      evaluator: scenario.scoring.evaluatorId,
      durationMs: 0,
      evidence: [],
      metadata: offlineMetadata(),
    };
  }

  const started = monotonicMs();
  try {
    const observation = await evaluator({ scenario });
    const outcome = parseEvaluationOutcome(observation.outcome);
    if (outcome !== 'PASS' && outcome !== 'FAIL') {
      throw new Error('Executable evaluators may return only PASS or FAIL.');
    }
    const score = validateScore(observation.score);
    if (
      scenario.passCriteria.kind === 'minimum_score' &&
      (score === null || (outcome === 'PASS' && score < scenario.passCriteria.minimumScore))
    ) {
      throw new Error('Evaluator outcome and minimum-score pass criteria are inconsistent.');
    }
    return {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      category: scenario.category,
      implementationStatus: scenario.implementationStatus,
      outcome,
      score,
      critical: scenario.critical,
      reason:
        observation.reason ??
        (outcome === 'PASS' ? 'Pass criteria satisfied.' : 'Pass criteria not satisfied.'),
      evaluator: scenario.scoring.evaluatorId,
      durationMs: Math.max(0, monotonicMs() - started),
      evidence: observation.evidence ?? [],
      metadata: observation.metadata ?? offlineMetadata(),
    };
  } catch (error) {
    return {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      category: scenario.category,
      implementationStatus: scenario.implementationStatus,
      outcome: 'ERROR',
      score: null,
      critical: scenario.critical,
      reason: error instanceof Error ? error.message : String(error),
      evaluator: scenario.scoring.evaluatorId,
      durationMs: Math.max(0, monotonicMs() - started),
      evidence: [],
      metadata: offlineMetadata(),
    };
  }
}

function summarize(results: readonly EvaluationResult[]): EvaluationSummary {
  const executable = results.filter(
    (result) => result.implementationStatus === 'executable',
  ).length;
  const passed = results.filter((result) => result.outcome === 'PASS').length;
  const failed = results.filter((result) => result.outcome === 'FAIL').length;
  const errors = results.filter((result) => result.outcome === 'ERROR').length;
  const denominator = passed + failed + errors;
  return {
    total: results.length,
    executable,
    passed,
    failed,
    skipped: results.filter((result) => result.outcome === 'SKIPPED').length,
    skippedPlanned: results.filter(
      (result) => result.outcome === 'SKIPPED' && result.implementationStatus === 'planned',
    ).length,
    errors,
    criticalFailures: results.filter(
      (result) => result.critical && (result.outcome === 'FAIL' || result.outcome === 'ERROR'),
    ).length,
    passRate: denominator === 0 ? null : passed / denominator,
  };
}

function suiteOutcome(summary: EvaluationSummary): EvaluationOutcome {
  if (summary.criticalFailures > 0 || summary.failed > 0) return 'FAIL';
  if (summary.errors > 0) return 'ERROR';
  if (summary.passed > 0) return 'PASS';
  return 'SKIPPED';
}

export async function runEvaluationSuite(options: EvaluationRunOptions): Promise<EvaluationReport> {
  const scenarios = validateScenarioCatalog(options.scenarios)
    .filter((scenario) => appliesFilter(scenario, options.filter))
    .toSorted(stableScenarioOrder);
  const monotonicMs = options.monotonicMs ?? (() => performance.now());
  const results: EvaluationResult[] = [];
  for (const scenario of scenarios) {
    results.push(
      scenario.implementationStatus === 'executable'
        ? await executeScenario(scenario, options.evaluators, monotonicMs)
        : skippedResult(scenario),
    );
  }
  const summary = summarize(results);
  return {
    runId: (options.runId ?? randomUUID)(),
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    harnessVersion: EVALUATION_HARNESS_VERSION,
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    suite: options.suite,
    outcome: suiteOutcome(summary),
    summary,
    results,
    metadata: { providerCalls: 0, estimatedCostUsd: 0 },
  };
}
