import { beforeEach, expect, test, vi } from 'vitest';

import { API_TELEMETRY_HEADERS, createApiTelemetryHeaders, getApiHealth } from './api-health.js';

beforeEach(() => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ environment: 'test', service: 'api', status: 'ok' }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    }),
  );
});

test('web health calls create per-call request IDs and propagate bounded correlation', async () => {
  const correlationId = crypto.randomUUID();
  const firstHeaders = createApiTelemetryHeaders(correlationId);
  const secondHeaders = createApiTelemetryHeaders(correlationId);

  expect(firstHeaders[API_TELEMETRY_HEADERS.correlationId]).toBe(correlationId);
  expect(secondHeaders[API_TELEMETRY_HEADERS.correlationId]).toBe(correlationId);
  expect(firstHeaders[API_TELEMETRY_HEADERS.requestId]).not.toBe(
    secondHeaders[API_TELEMETRY_HEADERS.requestId],
  );

  await expect(getApiHealth(new AbortController().signal, correlationId)).resolves.toEqual({
    environment: 'test',
    service: 'api',
    status: 'ok',
  });
  expect(fetch).toHaveBeenCalledWith(
    'http://127.0.0.1:3000/health',
    expect.objectContaining({
      headers: expect.objectContaining({
        [API_TELEMETRY_HEADERS.correlationId]: correlationId,
      }),
    }),
  );
});

test('web replaces malformed supplied correlation IDs', () => {
  const headers = createApiTelemetryHeaders('malformed\r\ninjected');
  expect(headers[API_TELEMETRY_HEADERS.correlationId]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});
