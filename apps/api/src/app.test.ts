import {
  createInMemoryLogSink,
  createLogger,
  generateTelemetryId,
  getTelemetryContext,
  isValidTelemetryId,
} from '@nexus-v2/observability';
import { afterEach, describe, expect, test } from 'vitest';

import { buildApi } from './app.js';

const openApps: Awaited<ReturnType<typeof buildApi>>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe('API smoke contracts', () => {
  test.each([
    ['/health', 200, { environment: 'test', service: 'api', status: 'ok' }],
    ['/ready', 200, { environment: 'test', service: 'api', status: 'ready' }],
  ])('%s responds in-process with its expected shape', async (url, statusCode, payload) => {
    const sink = createInMemoryLogSink();
    const app = await buildApi({
      environment: 'test',
      logger: createLogger({ environment: 'test', service: 'api', sink }),
      webOrigin: 'http://web.example.test',
    });
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toEqual(payload);
    expect(isValidTelemetryId(response.headers['x-request-id'])).toBe(true);
    expect(isValidTelemetryId(response.headers['x-correlation-id'])).toBe(true);
  });

  test('preserves valid correlation, isolates requests, and logs matching identifiers', async () => {
    const sink = createInMemoryLogSink();
    const logger = createLogger({ environment: 'test', service: 'api', sink });
    const app = await buildApi({
      environment: 'test',
      logger,
      webOrigin: 'http://web.example.test',
    });
    openApps.push(app);

    app.get('/async-context', async () => {
      await Promise.resolve();
      const context = getTelemetryContext();
      return { correlationId: context?.correlationId, requestId: context?.requestId };
    });

    const correlationId = generateTelemetryId();
    const first = await app.inject({
      headers: { 'x-correlation-id': correlationId },
      method: 'GET',
      url: '/async-context',
    });
    const second = await app.inject({ method: 'GET', url: '/health' });

    expect(first.headers['x-correlation-id']).toBe(correlationId);
    expect(first.json()).toEqual({
      correlationId,
      requestId: first.headers['x-request-id'],
    });
    expect(second.headers['x-request-id']).not.toBe(first.headers['x-request-id']);
    expect(second.headers['x-correlation-id']).not.toBe(correlationId);
    expect(getTelemetryContext()).toBeUndefined();

    const firstLogs = sink.entries.filter(
      (entry) => entry.request_id === first.headers['x-request-id'],
    );
    expect(firstLogs.map((entry) => entry.event)).toEqual([
      'api.request.started',
      'api.request.completed',
    ]);
    expect(firstLogs.every((entry) => entry.correlation_id === correlationId)).toBe(true);
  });

  test('replaces malformed identifiers and never logs headers or bodies', async () => {
    const sink = createInMemoryLogSink();
    const app = await buildApi({
      environment: 'test',
      logger: createLogger({ environment: 'test', service: 'api', sink }),
      webOrigin: 'http://web.example.test',
    });
    openApps.push(app);

    const response = await app.inject({
      headers: {
        authorization: 'Bearer synthetic-authorization-value',
        'x-correlation-id': 'x'.repeat(200),
        'x-request-id': 'malformed-request-id',
      },
      method: 'POST',
      payload: { password: 'synthetic-password', privateNote: 'synthetic-business-payload' },
      url: '/missing',
    });

    expect(response.statusCode).toBe(404);
    expect(isValidTelemetryId(response.headers['x-correlation-id'])).toBe(true);
    expect(isValidTelemetryId(response.headers['x-request-id'])).toBe(true);
    const captured = JSON.stringify(sink.entries);
    expect(captured).not.toContain('synthetic-authorization-value');
    expect(captured).not.toContain('synthetic-password');
    expect(captured).not.toContain('synthetic-business-payload');
  });
});
