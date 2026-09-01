import cors from '@fastify/cors';
import {
  addSpanToTelemetryContext,
  createLogger,
  createNexusTracing,
  establishTelemetryContext,
  runWithTelemetryContext,
  safeErrorMetadata,
  TELEMETRY_HEADERS,
  type NexusLogger,
  type NexusSpan,
  type NexusTracing,
  type RuntimeEnvironment,
  type TelemetryContext,
} from '@nexus-v2/observability';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

export interface ApiOptions {
  environment?: RuntimeEnvironment;
  logger?: NexusLogger;
  tracing?: NexusTracing;
  webOrigin: string;
}

interface RequestTelemetryState {
  readonly context: TelemetryContext;
  readonly span: NexusSpan;
  readonly startedAt: bigint;
}

const pathWithoutQuery = (url: string): string => url.split('?', 1)[0] ?? '/';

export const buildApi = async ({
  environment = 'unknown',
  logger = createLogger({ environment, service: 'api' }),
  tracing = createNexusTracing(),
  webOrigin,
}: ApiOptions): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });
  const requestTelemetry = new WeakMap<FastifyRequest, RequestTelemetryState>();

  await app.register(cors, {
    allowedHeaders: ['content-type', TELEMETRY_HEADERS.correlationId, TELEMETRY_HEADERS.requestId],
    exposedHeaders: [TELEMETRY_HEADERS.correlationId, TELEMETRY_HEADERS.requestId],
    origin: webOrigin,
  });

  app.addHook('onRequest', (request, reply, done) => {
    const baseContext = establishTelemetryContext({
      correlationId: request.headers[TELEMETRY_HEADERS.correlationId],
      requestId: request.headers[TELEMETRY_HEADERS.requestId],
    });
    const path = pathWithoutQuery(request.url);
    const span = tracing.startSpan('api.http_request', {
      'http.request.method': request.method,
      'url.path': path,
    });
    const context = addSpanToTelemetryContext(baseContext, span);
    requestTelemetry.set(request, { context, span, startedAt: process.hrtime.bigint() });

    reply.header(TELEMETRY_HEADERS.requestId, context.requestId);
    reply.header(TELEMETRY_HEADERS.correlationId, context.correlationId);

    runWithTelemetryContext(context, () => {
      logger.info('api.request.started', { method: request.method, path });
      done();
    });
  });

  app.addHook('onError', (request, _reply, error, done) => {
    const state = requestTelemetry.get(request);
    if (state !== undefined) {
      state.span.recordError(error);
      runWithTelemetryContext(state.context, () => {
        logger.error('api.request.failed', {
          ...safeErrorMetadata(error),
          method: request.method,
          path: pathWithoutQuery(request.url),
        });
      });
    }
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const state = requestTelemetry.get(request);
    if (state !== undefined) {
      const durationMilliseconds = Number(process.hrtime.bigint() - state.startedAt) / 1_000_000;
      runWithTelemetryContext(state.context, () => {
        logger.info('api.request.completed', {
          duration_ms: Number(durationMilliseconds.toFixed(3)),
          method: request.method,
          path: pathWithoutQuery(request.url),
          status_code: reply.statusCode,
        });
      });
      state.span.end();
      requestTelemetry.delete(request);
    }
    done();
  });

  app.get('/health', async () => ({ environment, service: 'api', status: 'ok' as const }));
  app.get('/ready', async () => ({ environment, service: 'api', status: 'ready' as const }));

  return app;
};
