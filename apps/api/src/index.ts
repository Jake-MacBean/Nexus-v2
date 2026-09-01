import {
  createLogger,
  resolveRuntimeEnvironment,
  safeErrorMetadata,
} from '@nexus-v2/observability';

import { buildApi } from './app.js';

const host = process.env.API_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173';
const environment = resolveRuntimeEnvironment(process.env.NODE_ENV);
const logger = createLogger({ environment, service: 'api' });

if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error('API_PORT must be an integer between 1 and 65535.');
}

const app = await buildApi({ environment, logger, webOrigin });

const stop = async () => {
  await app.close();
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  await app.listen({ host, port });
  logger.info('api.ready', { host, port });
} catch (error: unknown) {
  logger.error('api.start_failed', safeErrorMetadata(error));
  process.exitCode = 1;
}
