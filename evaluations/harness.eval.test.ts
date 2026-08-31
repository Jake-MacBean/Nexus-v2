import { readFile } from 'node:fs/promises';

import { describe, expect, test, vi } from 'vitest';

import {
  compareEvaluationBaseline,
  normalizeEvaluationReport,
  parseVersionedEvaluationBaseline,
} from './baselines/compare.ts';
import { formatEvaluationSummary, serializeEvaluationReport } from './reporting/report.ts';
import { runEvaluationSuite } from './runners/run.ts';
import {
  parseEvaluationOutcome,
  parseEvaluationScenario,
  validateScenarioCatalog,
  type EvaluationScenario,
} from './schemas/scenario.ts';
import { harnessSelfEvaluatorRegistry, harnessSelfScenarios } from './scenarios/harness-self.ts';
import { plannedScenarios } from './scenarios/planned.ts';

const selfScenarios = harnessSelfScenarios.map(({ scenario }) => scenario);

async function deterministicSelfReport(scenarios: readonly EvaluationScenario[] = selfScenarios) {
  let time = 0;
  return runEvaluationSuite({
    suite: 'vitest-harness-self',
    scenarios,
    evaluators: harnessSelfEvaluatorRegistry,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    runId: () => 'fixed-run-id',
    monotonicMs: () => time++,
  });
}

describe('evaluation scenario governance', () => {
  test('accepts a valid typed, versioned scenario', () => {
    expect(parseEvaluationScenario(plannedScenarios[0])).toEqual(plannedScenarios[0]);
  });

  test('rejects invalid category, status, and outcome values', () => {
    expect(() => parseEvaluationScenario({ ...plannedScenarios[0], category: 'invented' })).toThrow(
      /scenario.category/u,
    );
    expect(() =>
      parseEvaluationScenario({ ...plannedScenarios[0], implementationStatus: 'passing' }),
    ).toThrow(/scenario.implementationStatus/u);
    expect(() => parseEvaluationOutcome('NOT_IMPLEMENTED')).toThrow(/outcome/u);
  });

  test('rejects duplicate scenario id and version pairs', () => {
    expect(() => validateScenarioCatalog([plannedScenarios[0], plannedScenarios[0]])).toThrow(
      /Duplicate evaluation scenario/u,
    );
  });

  test('represents every Foundation-required category exactly once in the initial catalog', () => {
    expect(plannedScenarios.map(({ category }) => category).toSorted()).toEqual(
      [
        'attention_interruption',
        'authority',
        'capability_selection',
        'contract_discrepancy',
        'cross_domain_synthesis',
        'duplicate_side_effects',
        'external_send_safety',
        'financial_reasoning',
        'permissions',
        'prompt_injection',
        'truth_hierarchy',
        'workspace_composition',
      ].toSorted(),
    );
    expect(
      plannedScenarios.every(({ implementationStatus }) => implementationStatus === 'planned'),
    ).toBe(true);
  });
});

describe('evaluation runner outcomes', () => {
  test('reports planned scenarios as skipped/not implemented and never invokes their evaluator', async () => {
    const forbiddenEvaluator = vi.fn(() => ({ outcome: 'PASS' as const }));
    const planned = harnessSelfScenarios.find(
      ({ expectedOutcome }) => expectedOutcome === 'SKIPPED',
    );
    expect(planned).toBeDefined();
    const report = await runEvaluationSuite({
      suite: 'planned-proof',
      scenarios: [planned!.scenario],
      evaluators: { 'harness.not-called': forbiddenEvaluator },
    });
    expect(report.results[0]).toMatchObject({ outcome: 'SKIPPED', score: null });
    expect(report.results[0]?.reason).toMatch(/^NOT IMPLEMENTED:/u);
    expect(report.summary.passRate).toBeNull();
    expect(report.outcome).toBe('SKIPPED');
    expect(forbiddenEvaluator).not.toHaveBeenCalled();
  });

  test('distinguishes deterministic pass, fail, and evaluator error', async () => {
    const report = await deterministicSelfReport();
    const outcomes = Object.fromEntries(
      report.results.map(({ scenarioId, outcome }) => [scenarioId, outcome]),
    );
    expect(outcomes['harness.pass']).toBe('PASS');
    expect(outcomes['harness.fail']).toBe('FAIL');
    expect(outcomes['harness.error']).toBe('ERROR');
  });

  test('records a noncritical failure without hiding it', async () => {
    const report = await deterministicSelfReport();
    expect(report.results.find(({ scenarioId }) => scenarioId === 'harness.fail')).toMatchObject({
      outcome: 'FAIL',
      critical: false,
    });
    expect(report.summary.failed).toBe(2);
  });

  test('makes a critical failure fail the suite regardless of numeric results', async () => {
    const report = await deterministicSelfReport();
    expect(report.summary.criticalFailures).toBe(1);
    expect(report.outcome).toBe('FAIL');
  });

  test('supports normalized numeric scoring without obscuring categorical outcomes', async () => {
    const report = await deterministicSelfReport();
    expect(
      report.results.find(({ scenarioId }) => scenarioId === 'harness.numeric-pass'),
    ).toMatchObject({
      outcome: 'PASS',
      score: 0.75,
    });
  });

  test('supports provider-free rule/assertion evaluation', async () => {
    const report = await deterministicSelfReport();
    expect(
      report.results.find(({ scenarioId }) => scenarioId === 'harness.rule-pass'),
    ).toMatchObject({
      outcome: 'PASS',
      evidence: ['observable-rule=true'],
    });
  });

  test('orders scenarios stably by id and version', async () => {
    const reversed = selfScenarios.toReversed();
    const report = await deterministicSelfReport(reversed);
    expect(report.results.map(({ scenarioId }) => scenarioId)).toEqual(
      selfScenarios.map(({ id }) => id).toSorted(),
    );
  });

  test('filters scenarios by category and conjunctive tags', async () => {
    const report = await runEvaluationSuite({
      suite: 'filter-proof',
      scenarios: [...plannedScenarios, ...selfScenarios],
      evaluators: harnessSelfEvaluatorRegistry,
      filter: { categories: ['harness_self_test'], tags: ['numeric', 'synthetic'] },
    });
    expect(report.results.map(({ scenarioId }) => scenarioId)).toEqual(['harness.numeric-pass']);
  });

  test('produces deterministic provider-free results after normalizing run metadata', async () => {
    const first = await deterministicSelfReport();
    const second = await runEvaluationSuite({
      suite: 'vitest-harness-self',
      scenarios: selfScenarios,
      evaluators: harnessSelfEvaluatorRegistry,
      now: () => new Date('2030-12-31T23:59:59.000Z'),
      runId: () => 'different-run-id',
      monotonicMs: () => 999,
    });
    expect(normalizeEvaluationReport(second)).toEqual(normalizeEvaluationReport(first));
    expect(first.metadata).toEqual({ providerCalls: 0, estimatedCostUsd: 0 });
  });
});

describe('evaluation reporting and regression evidence', () => {
  test('emits the required structured JSON report shape', async () => {
    const report = await deterministicSelfReport();
    const json = JSON.parse(serializeEvaluationReport(report)) as Record<string, unknown>;
    expect(json).toMatchObject({
      runId: 'fixed-run-id',
      timestamp: '2026-01-01T00:00:00.000Z',
      harnessVersion: '1.0.0',
      schemaVersion: '1.0.0',
      suite: 'vitest-harness-self',
      metadata: { providerCalls: 0, estimatedCostUsd: 0 },
    });
    expect(Array.isArray(json.results)).toBe(true);
  });

  test('renders concise human output without hiding planned scenarios', async () => {
    const report = await runEvaluationSuite({
      suite: 'planned-report-proof',
      scenarios: plannedScenarios,
      evaluators: {},
    });
    const output = formatEvaluationSummary(report);
    expect(output).toContain('Passed: 0');
    expect(output).toContain(`Skipped planned: ${plannedScenarios.length}`);
    expect(output).toContain('NOT IMPLEMENTED');
    expect(output).toContain('Provider calls: 0; estimated cost: $0.00');
  });

  test('detects regressions, improvements, score changes, and critical regressions', async () => {
    const baselineJson = await readFile(
      new URL('./baselines/harness-self.v1.json', import.meta.url),
      'utf8',
    );
    const comparison = compareEvaluationBaseline(
      parseVersionedEvaluationBaseline(JSON.parse(baselineJson)),
      normalizeEvaluationReport(await deterministicSelfReport()),
    );
    expect(comparison.regressions).toEqual(['harness.critical-fail@1', 'harness.fail@1']);
    expect(comparison.improvements).toEqual(['harness.pass@1']);
    expect(comparison.changedScores).toEqual(['harness.numeric-pass@1']);
    expect(comparison.criticalRegressions).toEqual(['harness.critical-fail@1']);
  });

  test('ignores timestamps, run ids, and duration when comparing baselines', async () => {
    const first = await deterministicSelfReport();
    const second = { ...first, runId: 'another-run', timestamp: '2040-01-01T00:00:00.000Z' };
    expect(normalizeEvaluationReport(second)).toEqual(normalizeEvaluationReport(first));
  });
});

describe('evaluation command isolation', () => {
  test('keeps evaluation discovery explicit and excluded from normal unit/integration projects', async () => {
    const config = await readFile(new URL('../vitest.config.ts', import.meta.url), 'utf8');
    expect(config).toContain("'**/*.eval.test.{ts,tsx}'");
    expect(config).toContain("include: ['evaluations/**/*.eval.test.ts']");
    expect(config).toContain("name: 'eval-harness'");
  });

  test('blocks unexpected provider/network access in harness tests', async () => {
    await expect(fetch('https://provider.example.test/live-evaluation')).rejects.toThrow(
      /Unexpected fetch in a unit test/u,
    );
  });
});
