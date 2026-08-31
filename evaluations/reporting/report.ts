import type { EvaluationReport } from '../runners/run.ts';

export function formatEvaluationSummary(report: EvaluationReport): string {
  const passRate =
    report.summary.passRate === null ? 'n/a' : `${(report.summary.passRate * 100).toFixed(1)}%`;
  const categoryCounts = new Map<
    string,
    { passed: number; failed: number; skipped: number; errors: number }
  >();
  for (const result of report.results) {
    const counts = categoryCounts.get(result.category) ?? {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
    };
    if (result.outcome === 'PASS') counts.passed += 1;
    if (result.outcome === 'FAIL') counts.failed += 1;
    if (result.outcome === 'SKIPPED') counts.skipped += 1;
    if (result.outcome === 'ERROR') counts.errors += 1;
    categoryCounts.set(result.category, counts);
  }

  const lines = [
    'Nexus Evaluations',
    `Suite: ${report.suite}`,
    `Outcome: ${report.outcome}`,
    `Executable: ${report.summary.executable}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    `Errors: ${report.summary.errors}`,
    `Skipped planned: ${report.summary.skippedPlanned}`,
    `Critical failures: ${report.summary.criticalFailures}`,
    `Pass rate (planned excluded): ${passRate}`,
    `Provider calls: ${report.metadata.providerCalls}; estimated cost: $${report.metadata.estimatedCostUsd.toFixed(2)}`,
    '',
    'Categories:',
  ];
  for (const [category, counts] of [...categoryCounts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    lines.push(
      `- ${category}: pass ${counts.passed}, fail ${counts.failed}, skipped ${counts.skipped}, error ${counts.errors}`,
    );
  }

  const skipped = report.results.filter((result) => result.outcome === 'SKIPPED');
  if (skipped.length > 0) {
    lines.push('', 'Skipped / not implemented:');
    for (const result of skipped)
      lines.push(`- ${result.scenarioId}@${result.scenarioVersion}: ${result.reason}`);
  }
  return lines.join('\n');
}

export function serializeEvaluationReport(report: EvaluationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
