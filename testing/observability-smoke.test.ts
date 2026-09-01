import {
  createInMemoryLogSink,
  createLogger,
  createNexusTracing,
  generateTelemetryId,
} from '@nexus-v2/observability';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { afterEach, expect, test } from 'vitest';

import { buildApi } from '../apps/api/src/app.js';
import { runWorkerOperation } from '../apps/worker/src/operation.js';

const openApps: Awaited<ReturnType<typeof buildApi>>[] = [];
const providers: BasicTracerProvider[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
  await Promise.all(providers.splice(0).map(async (provider) => provider.shutdown()));
});

test('one logical correlation ID crosses API and worker technical paths without app coupling', async () => {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  providers.push(provider);
  const tracing = createNexusTracing({ tracerProvider: provider });
  const apiSink = createInMemoryLogSink();
  const workerSink = createInMemoryLogSink();
  const app = await buildApi({
    environment: 'test',
    logger: createLogger({ environment: 'test', service: 'api', sink: apiSink }),
    tracing,
    webOrigin: 'http://web.example.test',
  });
  openApps.push(app);

  const correlationId = generateTelemetryId();
  const apiResponse = await app.inject({
    headers: { 'x-correlation-id': correlationId },
    method: 'GET',
    url: '/health',
  });
  const workerResult = await runWorkerOperation(
    {
      correlationId,
      logger: createLogger({ environment: 'test', service: 'worker', sink: workerSink }),
      operation: 'smoke.technical_path',
      tracing,
    },
    async () => Promise.resolve('ok'),
  );

  const apiLog = apiSink.entries.find((entry) => entry.event === 'api.request.completed');
  const workerLog = workerSink.entries.find(
    (entry) => entry.event === 'worker.operation.completed',
  );
  expect(apiLog).toMatchObject({ correlation_id: correlationId, service: 'api' });
  expect(workerLog).toMatchObject({ correlation_id: correlationId, service: 'worker' });
  expect(apiLog?.request_id).toBe(apiResponse.headers['x-request-id']);
  expect(workerLog?.request_id).toBe(workerResult.context.requestId);
  expect(apiLog?.request_id).not.toBe(workerLog?.request_id);
  expect(apiLog?.trace_id).toMatch(/^[0-9a-f]{32}$/);
  expect(apiLog?.span_id).toMatch(/^[0-9a-f]{16}$/);
  expect(workerLog?.trace_id).toMatch(/^[0-9a-f]{32}$/);
  expect(workerLog?.span_id).toMatch(/^[0-9a-f]{16}$/);
  expect(exporter.getFinishedSpans()).toHaveLength(2);
});
