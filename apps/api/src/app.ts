import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

export interface ApiOptions {
  logger?: boolean;
  webOrigin: string;
}

export const buildApi = async ({ logger, webOrigin }: ApiOptions): Promise<FastifyInstance> => {
  const app = Fastify({ logger: logger ?? true });

  await app.register(cors, { origin: webOrigin });

  app.get('/health', async () => ({ service: 'api', status: 'ok' as const }));
  app.get('/ready', async () => ({ service: 'api', status: 'ready' as const }));

  return app;
};
