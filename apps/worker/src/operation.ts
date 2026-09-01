import {
  addSpanToTelemetryContext,
  createNexusTracing,
  establishTelemetryContext,
  runWithTelemetryContext,
  safeErrorMetadata,
  type NexusLogger,
  type NexusTracing,
  type TelemetryContext,
} from '@nexus-v2/observability';

export interface WorkerOperationOptions {
  readonly correlationId?: unknown;
  readonly logger: NexusLogger;
  readonly operation: string;
  readonly requestId?: unknown;
  readonly tracing?: NexusTracing;
}

export interface WorkerOperationResult<Result> {
  readonly context: TelemetryContext;
  readonly result: Result;
}

export const runWorkerOperation = async <Result>(
  options: WorkerOperationOptions,
  operation: () => Result | Promise<Result>,
): Promise<WorkerOperationResult<Result>> => {
  const tracing = options.tracing ?? createNexusTracing();
  const span = tracing.startSpan('worker.operation', { operation: options.operation });
  const context = addSpanToTelemetryContext(
    establishTelemetryContext({
      correlationId: options.correlationId,
      requestId: options.requestId,
    }),
    span,
  );

  return runWithTelemetryContext(context, async () => {
    options.logger.info('worker.operation.started', { operation: options.operation });
    try {
      const result = await operation();
      options.logger.info('worker.operation.completed', { operation: options.operation });
      return { context, result };
    } catch (error: unknown) {
      span.recordError(error);
      options.logger.error('worker.operation.failed', {
        ...safeErrorMetadata(error),
        operation: options.operation,
      });
      throw error;
    } finally {
      span.end();
    }
  });
};
