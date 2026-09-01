import {
  createInMemoryLogSink,
  createLogger,
  generateTelemetryId,
  getTelemetryContext,
  isValidTelemetryId,
} from '@nexus-v2/observability';
import { describe, expect, test } from 'vitest';

import { createWorkerHealthHandler } from './health-handler.js';
import { workerHealthResponse } from './health.js';
import { runWorkerOperation } from './operation.js';

describe('worker health and readiness', () => {
  test('health means alive while readiness follows the lifecycle state', () => {
    expect(workerHealthResponse('health', 'starting', 'test')).toEqual({
      body: { environment: 'test', service: 'worker', status: 'ok' },
      statusCode: 200,
    });
    expect(workerHealthResponse('ready', 'starting', 'test')).toEqual({
      body: { environment: 'test', service: 'worker', status: 'not_ready' },
      statusCode: 503,
    });
    expect(workerHealthResponse('ready', 'ready', 'test')).toEqual({
      body: { environment: 'test', service: 'worker', status: 'ready' },
      statusCode: 200,
    });
  });

  test('technical health responses preserve valid correlation and expose request IDs', async () => {
    const sink = createInMemoryLogSink();
    const logger = createLogger({ environment: 'test', service: 'worker', sink });
    const handler = createWorkerHealthHandler({
      environment: 'test',
      getState: () => 'ready',
      logger,
    });
    const correlationId = generateTelemetryId();

    const response = await handler({ correlationId, method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ environment: 'test', service: 'worker', status: 'ready' });
    expect(response.headers['x-correlation-id']).toBe(correlationId);
    expect(isValidTelemetryId(response.headers['x-request-id'])).toBe(true);
    expect(sink.entries.every((entry) => entry.correlation_id === correlationId)).toBe(true);
  });
});

describe('worker technical operation context', () => {
  test('preserves correlation, creates an operation ID, and survives async work', async () => {
    const sink = createInMemoryLogSink();
    const logger = createLogger({ environment: 'test', service: 'worker', sink });
    const correlationId = generateTelemetryId();
    let asynchronousContext = getTelemetryContext();

    const operation = await runWorkerOperation(
      { correlationId, logger, operation: 'test.technical_operation' },
      async () => {
        await Promise.resolve();
        asynchronousContext = getTelemetryContext();
        return 'complete';
      },
    );

    expect(operation.result).toBe('complete');
    expect(operation.context.correlationId).toBe(correlationId);
    expect(isValidTelemetryId(operation.context.requestId)).toBe(true);
    expect(asynchronousContext).toEqual(operation.context);
    expect(getTelemetryContext()).toBeUndefined();
    expect(sink.entries.map((entry) => entry.event)).toEqual([
      'worker.operation.started',
      'worker.operation.completed',
    ]);
    expect(sink.entries.every((entry) => entry.request_id === operation.context.requestId)).toBe(
      true,
    );
  });
});
