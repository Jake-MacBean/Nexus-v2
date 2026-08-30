import { buildApi } from './app.js';

const host = process.env.API_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173';

if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error('API_PORT must be an integer between 1 and 65535.');
}

const app = await buildApi({ webOrigin });

const stop = async () => {
  await app.close();
};

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  await app.listen({ host, port });
} catch (error: unknown) {
  app.log.error(error);
  process.exitCode = 1;
}
