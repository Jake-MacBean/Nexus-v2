export type WorkerState = 'starting' | 'ready' | 'stopping';

export interface WorkerHealthResponse {
  readonly body: {
    readonly service: 'worker';
    readonly startedAt: string;
    readonly status: WorkerState;
  };
  readonly statusCode: 200 | 503;
}

export function workerHealthResponse(state: WorkerState, startedAt: string): WorkerHealthResponse {
  return {
    body: { service: 'worker', startedAt, status: state },
    statusCode: state === 'ready' ? 200 : 503,
  };
}
