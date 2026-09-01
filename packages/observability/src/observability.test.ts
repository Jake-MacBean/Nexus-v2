import { Writable } from 'node:stream';

import { describe, expect, test } from 'vitest';

import {
  createInMemoryLogSink,
  createLogger,
  createNexusTracing,
  createPinoLogSink,
  establishTelemetryContext,
  generateTelemetryId,
  getTelemetryContext,
  isValidTelemetryId,
  REDACTED,
  runWithTelemetryContext,
  safeErrorMetadata,
  sanitizeLogMetadata,
} from './index.js';

describe('telemetry identifiers and async context', () => {
  test('generates valid unique opaque identifiers', () => {
    const first = generateTelemetryId();
    const second = generateTelemetryId();

    expect(isValidTelemetryId(first)).toBe(true);
    expect(isValidTelemetryId(second)).toBe(true);
    expect(first).not.toBe(second);
  });

  test('preserves valid inbound IDs and safely replaces malformed values', () => {
    const correlationId = generateTelemetryId();
    const preserved = establishTelemetryContext({ correlationId });
    const replaced = establishTelemetryContext({
      correlationId: `${'x'.repeat(200)}\r\ninjected`,
      requestId: 'not-a-uuid',
    });

    expect(preserved.correlationId).toBe(correlationId);
    expect(isValidTelemetryId(preserved.requestId)).toBe(true);
    expect(isValidTelemetryId(replaced.correlationId)).toBe(true);
    expect(isValidTelemetryId(replaced.requestId)).toBe(true);
    expect(replaced.correlationId).not.toContain('injected');
  });

  test('keeps context through async work and does not leak afterward', async () => {
    const context = establishTelemetryContext();
    await runWithTelemetryContext(context, async () => {
      await Promise.resolve();
      expect(getTelemetryContext()).toEqual(context);
    });

    expect(getTelemetryContext()).toBeUndefined();
  });
});

describe('structured logging and privacy', () => {
  test('captures deterministic contextual fields without fabricating span identifiers', () => {
    const sink = createInMemoryLogSink();
    const logger = createLogger({
      clock: () => new Date('2026-01-01T00:00:00.000Z'),
      environment: 'test',
      service: 'api',
      sink,
    });
    const context = establishTelemetryContext();

    runWithTelemetryContext(context, () => logger.info('test.completed', { status_code: 200 }));

    expect(sink.entries).toEqual([
      {
        correlation_id: context.correlationId,
        environment: 'test',
        event: 'test.completed',
        level: 'info',
        request_id: context.requestId,
        service: 'api',
        status_code: 200,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(sink.entries[0]).not.toHaveProperty('trace_id');
    expect(sink.entries[0]).not.toHaveProperty('span_id');
  });

  test('the production Pino sink emits one structured JSON record', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createLogger({
      clock: () => new Date('2026-01-01T00:00:00.000Z'),
      environment: 'development',
      service: 'worker',
      sink: createPinoLogSink({ destination }),
    });

    logger.warn('worker.test_warning', { status_code: 503 });

    expect(JSON.parse(output)).toEqual({
      environment: 'development',
      event: 'worker.test_warning',
      level: 'warn',
      service: 'worker',
      status_code: 503,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  test('redacts high-risk keys recursively and sanitizes credential-bearing text', () => {
    const syntheticCredentialUrl = [
      'https://',
      'synthetic-user',
      ':',
      'synthetic-password',
      '@example.test/path',
    ].join('');
    const expectedRedactedUrl = ['https://', REDACTED, '@example.test/path'].join('');
    const sanitized = sanitizeLogMetadata({
      Authorization: 'Bearer synthetic-authorization-value',
      nested: {
        api_key: 'synthetic-api-key',
        safe: syntheticCredentialUrl,
        SetCookie: 'synthetic-cookie',
      },
      refreshToken: 'synthetic-refresh-token',
    });

    expect(sanitized).toEqual({
      Authorization: REDACTED,
      nested: {
        api_key: REDACTED,
        safe: expectedRedactedUrl,
        SetCookie: REDACTED,
      },
      refreshToken: REDACTED,
    });
    expect(JSON.stringify(sanitized)).not.toContain('synthetic-password');
    expect(JSON.stringify(sanitized)).not.toContain('synthetic-api-key');
  });

  test('logs only safe Error fields and removes bearer material', () => {
    const error = new Error('Request failed for Bearer synthetic-token');
    Object.assign(error, { requestBody: 'synthetic-business-payload', secret: 'synthetic-secret' });

    const metadata = safeErrorMetadata(error);
    const serialized = JSON.stringify(metadata);
    expect(serialized).toContain(`Bearer ${REDACTED}`);
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('synthetic-business-payload');
    expect(serialized).not.toContain('synthetic-secret');
  });

  test('the default OpenTelemetry boundary is safe without a registered provider', () => {
    const tracing = createNexusTracing();
    const span = tracing.startSpan('test.noop');

    expect(span.traceId).toBeUndefined();
    expect(span.spanId).toBeUndefined();
    expect(() => span.end()).not.toThrow();
    expect(() => tracing.meter.createCounter('test_noop_counter').add(1)).not.toThrow();
  });
});
