import { createServer } from 'node:http';

import {
  createLogger,
  resolveRuntimeEnvironment,
  safeErrorMetadata,
  TELEMETRY_HEADERS,
} from '@nexus-v2/observability';

import { createWorkerHealthHandler } from './health-handler.js';
import type { WorkerState } from './health.js';

const host = process.env.WORKER_HEALTH_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.WORKER_HEALTH_PORT ?? '3001', 10);
const environment = resolveRuntimeEnvironment(process.env.NODE_ENV);
const logger = createLogger({ environment, service: 'worker' });

if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error('WORKER_HEALTH_PORT must be an integer between 1 and 65535.');
}

let state: WorkerState = 'starting';
const handleHealth = createWorkerHealthHandler({ environment, getState: () => state, logger });

const healthServer = createServer(async (request, response) => {
  try {
    const result = await handleHealth({
      correlationId: request.headers[TELEMETRY_HEADERS.correlationId],
      method: request.method,
      requestId: request.headers[TELEMETRY_HEADERS.requestId],
      url: request.url,
    });
    response.writeHead(result.statusCode, {
      'content-type': 'application/json',
      ...result.headers,
    });
    response.end(JSON.stringify(result.body));
  } catch (error: unknown) {
    logger.error('worker.health_request.failed', safeErrorMetadata(error));
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'error' }));
  }
});

const stop = () => {
  state = 'stopping';
  healthServer.close((error) => {
    if (error !== undefined) {
      logger.error('worker.stop_failed', safeErrorMetadata(error));
      process.exitCode = 1;
      return;
    }

    logger.info('worker.stopped');
  });
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

healthServer.listen(port, host, () => {
  state = 'ready';
  logger.info('worker.ready', { health_path: '/health', host, port, ready_path: '/ready' });
});
