import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  compareEvaluationBaseline,
  normalizeEvaluationReport,
  parseVersionedEvaluationBaseline,
} from './baselines/compare.ts';
import { evaluationCatalog } from './catalog.ts';
import { formatEvaluationSummary, serializeEvaluationReport } from './reporting/report.ts';
import { runEvaluationSuite, type EvaluationFilter } from './runners/run.ts';
import { evaluationCategories, type EvaluationCategory } from './schemas/scenario.ts';
import { harnessSelfEvaluatorRegistry, harnessSelfScenarios } from './scenarios/harness-self.ts';

function readFilter(arguments_: readonly string[]): EvaluationFilter | undefined {
  const categories: EvaluationCategory[] = [];
  const tags: string[] = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    if (argument === '--category') {
      if (!value || !evaluationCategories.includes(value as EvaluationCategory)) {
        throw new Error(`--category requires one of: ${evaluationCategories.join(', ')}`);
      }
      categories.push(value as EvaluationCategory);
      index += 1;
    } else if (argument === '--tag') {
      if (!value) throw new Error('--tag requires a value.');
      tags.push(value);
      index += 1;
    } else {
      throw new Error(`Unknown evaluation option: ${argument}`);
    }
  }
  return categories.length === 0 && tags.length === 0
    ? undefined
    : {
        ...(categories.length > 0 ? { categories } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      };
}

async function runCatalog(arguments_: readonly string[], writeJson: boolean): Promise<void> {
  const filter = readFilter(arguments_);
  const report = await runEvaluationSuite({
    suite: 'nexus-planned-capability-catalog',
    scenarios: evaluationCatalog,
    evaluators: {},
    ...(filter ? { filter } : {}),
  });
  console.log(formatEvaluationSummary(report));
  if (writeJson) {
    const resultsDirectory = fileURLToPath(new URL('./results/', import.meta.url));
    await mkdir(resultsDirectory, { recursive: true });
    const reportPath = fileURLToPath(new URL('./results/latest.json', import.meta.url));
    await writeFile(reportPath, serializeEvaluationReport(report), 'utf8');
    console.log(`\nJSON report: ${reportPath}`);
  }
  if (report.outcome === 'FAIL' || report.outcome === 'ERROR') process.exitCode = 1;
}

function listCatalog(arguments_: readonly string[]): void {
  const filter = readFilter(arguments_);
  const scenarios = evaluationCatalog
    .filter(
      (scenario) =>
        (!filter?.categories || filter.categories.includes(scenario.category)) &&
        (!filter?.tags || filter.tags.every((tag) => scenario.tags.includes(tag))),
    )
    .toSorted((left, right) =>
      `${left.id}@${left.version}`.localeCompare(`${right.id}@${right.version}`),
    );
  console.log(`Nexus Evaluation Catalog (${scenarios.length})`);
  for (const scenario of scenarios) {
    console.log(
      `${scenario.id}@${scenario.version} | ${scenario.category} | ${scenario.implementationStatus.toUpperCase()} | ${scenario.riskLevel}${scenario.critical ? ' CRITICAL' : ''}`,
    );
    console.log(`  ${scenario.statusReason}`);
  }
}

async function runSelfCheck(): Promise<void> {
  let time = 0;
  const report = await runEvaluationSuite({
    suite: 'harness-self-test',
    scenarios: harnessSelfScenarios.map(({ scenario }) => scenario),
    evaluators: harnessSelfEvaluatorRegistry,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    runId: () => 'harness-self-test-run',
    monotonicMs: () => time++,
  });
  const expectedById = new Map(
    harnessSelfScenarios.map(({ scenario, expectedOutcome }) => [scenario.id, expectedOutcome]),
  );
  const mismatches = report.results.filter(
    (result) => expectedById.get(result.scenarioId) !== result.outcome,
  );
  console.log('Synthetic inner suite (intentional failure/error cases are expected):');
  console.log(formatEvaluationSummary(report));
  if (mismatches.length > 0) {
    console.error(
      `\nHarness self-check FAILED: ${mismatches.map((result) => result.scenarioId).join(', ')}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `\nHarness self-check PASS: ${report.results.length}/${report.results.length} synthetic outcomes matched.`,
    );
  }
}

async function runBaselineProof(): Promise<void> {
  let time = 0;
  const report = await runEvaluationSuite({
    suite: 'harness-baseline-candidate',
    scenarios: harnessSelfScenarios.map(({ scenario }) => scenario),
    evaluators: harnessSelfEvaluatorRegistry,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    runId: () => 'ignored-by-baseline-normalization',
    monotonicMs: () => time++,
  });
  const baselinePath = fileURLToPath(new URL('./baselines/harness-self.v1.json', import.meta.url));
  const baseline = parseVersionedEvaluationBaseline(
    JSON.parse(await readFile(baselinePath, 'utf8')),
  );
  const comparison = compareEvaluationBaseline(baseline, normalizeEvaluationReport(report));
  console.log('Nexus Evaluation Baseline Proof');
  console.log(`Baseline: ${baseline.name}`);
  console.log(`Regressions: ${comparison.regressions.join(', ') || 'none'}`);
  console.log(`Improvements: ${comparison.improvements.join(', ') || 'none'}`);
  console.log(`Changed scores: ${comparison.changedScores.join(', ') || 'none'}`);
  console.log(`Critical regressions: ${comparison.criticalRegressions.join(', ') || 'none'}`);
  const validProof =
    comparison.regressions.includes('harness.fail@1') &&
    comparison.regressions.includes('harness.critical-fail@1') &&
    comparison.improvements.includes('harness.pass@1') &&
    comparison.changedScores.includes('harness.numeric-pass@1') &&
    comparison.criticalRegressions.includes('harness.critical-fail@1') &&
    comparison.missing.length === 0;
  if (!validProof) {
    console.error('Synthetic baseline mechanics proof failed.');
    process.exitCode = 1;
  } else {
    console.log('Baseline mechanics PASS. Synthetic changes were detected as expected.');
  }
}

async function main(): Promise<void> {
  const [command = 'run', ...arguments_] = process.argv.slice(2);
  if (command === 'run') await runCatalog(arguments_, false);
  else if (command === 'report') await runCatalog(arguments_, true);
  else if (command === 'list') listCatalog(arguments_);
  else if (command === 'self') await runSelfCheck();
  else if (command === 'baseline') await runBaselineProof();
  else throw new Error(`Unknown evaluation command: ${command}`);
}

try {
  await main();
} catch (error) {
  console.error(
    `Evaluation infrastructure error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
