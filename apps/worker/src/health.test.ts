import { expect, test } from 'vitest';

import { workerHealthResponse } from './health.js';

test('worker health is ready only during its ready lifecycle state', () => {
  const startedAt = '2026-01-01T00:00:00.000Z';

  expect(workerHealthResponse('starting', startedAt)).toEqual({
    body: { service: 'worker', startedAt, status: 'starting' },
    statusCode: 503,
  });
  expect(workerHealthResponse('ready', startedAt)).toEqual({
    body: { service: 'worker', startedAt, status: 'ready' },
    statusCode: 200,
  });
  expect(workerHealthResponse('stopping', startedAt).statusCode).toBe(503);
});
