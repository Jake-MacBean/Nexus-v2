import { afterEach, describe, expect, test } from 'vitest';

import { buildApi } from './app.js';

const openApps: Awaited<ReturnType<typeof buildApi>>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe('API smoke contracts', () => {
  test.each([
    ['/health', 200, { service: 'api', status: 'ok' }],
    ['/ready', 200, { service: 'api', status: 'ready' }],
  ])('%s responds in-process with its expected shape', async (url, statusCode, payload) => {
    const app = await buildApi({ logger: false, webOrigin: 'http://web.example.test' });
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toEqual(payload);
  });
});
