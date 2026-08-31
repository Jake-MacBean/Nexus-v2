import { createServer } from 'node:http';

import { workerHealthResponse, type WorkerState } from './health.js';

const host = process.env.WORKER_HEALTH_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.WORKER_HEALTH_PORT ?? '3001', 10);

if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error('WORKER_HEALTH_PORT must be an integer between 1 and 65535.');
}

let state: WorkerState = 'starting';
const startedAt = new Date().toISOString();

const healthServer = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    const health = workerHealthResponse(state, startedAt);
    response.writeHead(health.statusCode, { 'content-type': 'application/json' });
    response.end(JSON.stringify(health.body));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: 'not_found' }));
});

const stop = () => {
  state = 'stopping';
  healthServer.close((error) => {
    if (error !== undefined) {
      console.error(JSON.stringify({ error: error.message, event: 'worker.stop_failed' }));
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify({ event: 'worker.stopped', service: 'worker' }));
  });
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

healthServer.listen(port, host, () => {
  state = 'ready';
  console.log(
    JSON.stringify({ event: 'worker.ready', healthUrl: `http://${host}:${port}/health` }),
  );
});
