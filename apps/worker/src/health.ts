import type { RuntimeEnvironment } from '@nexus-v2/observability';

export type WorkerState = 'starting' | 'ready' | 'stopping';
export type WorkerProbe = 'health' | 'ready';

export interface WorkerHealthResponse {
  readonly body: {
    readonly environment: RuntimeEnvironment;
    readonly service: 'worker';
    readonly status: 'not_ready' | 'ok' | 'ready';
  };
  readonly statusCode: 200 | 503;
}

export function workerHealthResponse(
  probe: WorkerProbe,
  state: WorkerState,
  environment: RuntimeEnvironment,
): WorkerHealthResponse {
  if (probe === 'health') {
    return {
      body: { environment, service: 'worker', status: 'ok' },
      statusCode: 200,
    };
  }

  const ready = state === 'ready';
  return {
    body: { environment, service: 'worker', status: ready ? 'ready' : 'not_ready' },
    statusCode: ready ? 200 : 503,
  };
}
