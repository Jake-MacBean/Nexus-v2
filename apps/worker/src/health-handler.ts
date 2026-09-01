import {
  TELEMETRY_HEADERS,
  type NexusLogger,
  type NexusTracing,
  type RuntimeEnvironment,
} from '@nexus-v2/observability';

import { workerHealthResponse, type WorkerState } from './health.js';
import { runWorkerOperation } from './operation.js';

export interface WorkerTechnicalRequest {
  readonly correlationId?: unknown;
  readonly method: string | undefined;
  readonly requestId?: unknown;
  readonly url: string | undefined;
}

export interface WorkerTechnicalResponse {
  readonly body: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly statusCode: number;
}

export interface WorkerHealthHandlerOptions {
  readonly environment: RuntimeEnvironment;
  readonly getState: () => WorkerState;
  readonly logger: NexusLogger;
  readonly tracing?: NexusTracing;
}

export const createWorkerHealthHandler =
  ({ environment, getState, logger, tracing }: WorkerHealthHandlerOptions) =>
  async (request: WorkerTechnicalRequest): Promise<WorkerTechnicalResponse> => {
    const operation = await runWorkerOperation(
      {
        correlationId: request.correlationId,
        logger,
        operation: 'worker.health_request',
        requestId: request.requestId,
        ...(tracing === undefined ? {} : { tracing }),
      },
      () => {
        if (request.method !== 'GET' || (request.url !== '/health' && request.url !== '/ready')) {
          return { body: { status: 'not_found' }, statusCode: 404 };
        }

        return workerHealthResponse(
          request.url === '/health' ? 'health' : 'ready',
          getState(),
          environment,
        );
      },
    );

    return {
      body: operation.result.body,
      headers: {
        [TELEMETRY_HEADERS.correlationId]: operation.context.correlationId,
        [TELEMETRY_HEADERS.requestId]: operation.context.requestId,
      },
      statusCode: operation.result.statusCode,
    };
  };
