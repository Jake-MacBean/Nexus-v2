import type { EvaluationScenario } from '../schemas/scenario.ts';

export interface EvaluationObservation {
  readonly outcome: 'PASS' | 'FAIL';
  readonly score?: number;
  readonly reason?: string;
  readonly evidence?: readonly string[];
  readonly metadata?: EvaluationExecutionMetadata;
}

export interface EvaluationExecutionMetadata {
  readonly profile: string;
  readonly provider: string | null;
  readonly model: string | null;
  readonly tokenUsage: { readonly input: number; readonly output: number } | null;
  readonly estimatedCostUsd: number;
  readonly [key: string]: unknown;
}

export interface EvaluationContext {
  readonly scenario: EvaluationScenario;
}

export type EvaluationFunction = (
  context: EvaluationContext,
) => EvaluationObservation | Promise<EvaluationObservation>;

export type EvaluatorRegistry = Readonly<Record<string, EvaluationFunction>>;

export interface FutureModelJudge {
  readonly id: string;
  evaluate(context: EvaluationContext): Promise<EvaluationObservation>;
}

export interface FutureHumanReviewRequest {
  readonly scenarioId: string;
  readonly observableEvidence: readonly string[];
  readonly rubric: readonly string[];
}

export interface FutureCompositeObservation {
  readonly deterministic?: EvaluationObservation;
  readonly modelJudged?: EvaluationObservation;
  readonly humanReviewed?: EvaluationObservation;
}
