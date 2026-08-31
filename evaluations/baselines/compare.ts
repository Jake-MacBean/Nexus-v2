import { parseEvaluationOutcome, type EvaluationOutcome } from '../schemas/scenario.ts';
import type { EvaluationReport, EvaluationResult } from '../runners/run.ts';

export interface EvaluationSnapshot {
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly outcome: EvaluationOutcome;
  readonly score: number | null;
  readonly critical: boolean;
}

export interface VersionedEvaluationBaseline {
  readonly baselineVersion: 1;
  readonly name: string;
  readonly description: string;
  readonly snapshots: readonly EvaluationSnapshot[];
}

export interface BaselineComparison {
  readonly regressions: readonly string[];
  readonly improvements: readonly string[];
  readonly changedScores: readonly string[];
  readonly criticalRegressions: readonly string[];
  readonly missing: readonly string[];
}

export function parseVersionedEvaluationBaseline(value: unknown): VersionedEvaluationBaseline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Evaluation baseline must be an object.');
  }
  const baseline = value as Record<string, unknown>;
  if (baseline.baselineVersion !== 1) throw new Error('Evaluation baseline version must be 1.');
  if (typeof baseline.name !== 'string' || typeof baseline.description !== 'string') {
    throw new Error('Evaluation baseline name and description are required.');
  }
  if (!Array.isArray(baseline.snapshots))
    throw new Error('Evaluation baseline snapshots must be an array.');
  const snapshots = baseline.snapshots.map((value, index): EvaluationSnapshot => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Evaluation baseline snapshot ${index} must be an object.`);
    }
    const snapshot = value as Record<string, unknown>;
    if (
      typeof snapshot.scenarioId !== 'string' ||
      !Number.isSafeInteger(snapshot.scenarioVersion) ||
      typeof snapshot.critical !== 'boolean' ||
      !(
        snapshot.score === null ||
        (typeof snapshot.score === 'number' && snapshot.score >= 0 && snapshot.score <= 1)
      )
    ) {
      throw new Error(`Evaluation baseline snapshot ${index} is invalid.`);
    }
    return {
      scenarioId: snapshot.scenarioId,
      scenarioVersion: Number(snapshot.scenarioVersion),
      outcome: parseEvaluationOutcome(snapshot.outcome),
      score: snapshot.score,
      critical: snapshot.critical,
    };
  });
  return { baselineVersion: 1, name: baseline.name, description: baseline.description, snapshots };
}

function identity(value: Pick<EvaluationSnapshot, 'scenarioId' | 'scenarioVersion'>): string {
  return `${value.scenarioId}@${value.scenarioVersion}`;
}

export function normalizeEvaluationResult(result: EvaluationResult): EvaluationSnapshot {
  return {
    scenarioId: result.scenarioId,
    scenarioVersion: result.scenarioVersion,
    outcome: result.outcome,
    score: result.score,
    critical: result.critical,
  };
}

export function normalizeEvaluationReport(report: EvaluationReport): readonly EvaluationSnapshot[] {
  return report.results
    .map(normalizeEvaluationResult)
    .toSorted((left, right) => identity(left).localeCompare(identity(right)));
}

export function compareEvaluationBaseline(
  baseline: VersionedEvaluationBaseline,
  candidate: readonly EvaluationSnapshot[],
): BaselineComparison {
  const candidateById = new Map(candidate.map((snapshot) => [identity(snapshot), snapshot]));
  const regressions: string[] = [];
  const improvements: string[] = [];
  const changedScores: string[] = [];
  const criticalRegressions: string[] = [];
  const missing: string[] = [];

  for (const accepted of baseline.snapshots.toSorted((left, right) =>
    identity(left).localeCompare(identity(right)),
  )) {
    const key = identity(accepted);
    const current = candidateById.get(key);
    if (!current) {
      missing.push(key);
      if (accepted.critical) criticalRegressions.push(key);
      continue;
    }
    const regressed = accepted.outcome === 'PASS' && current.outcome !== 'PASS';
    const improved = accepted.outcome !== 'PASS' && current.outcome === 'PASS';
    if (regressed) regressions.push(key);
    if (improved) improvements.push(key);
    if (regressed && accepted.critical) criticalRegressions.push(key);
    if (accepted.score !== current.score) changedScores.push(key);
  }

  return { regressions, improvements, changedScores, criticalRegressions, missing };
}
