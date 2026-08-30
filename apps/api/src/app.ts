import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

export interface ApiOptions {
  webOrigin: string;
}

export const buildApi = async ({ webOrigin }: ApiOptions): Promise<FastifyInstance> => {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: webOrigin });

  app.get('/health', async () => ({ service: 'api', status: 'ok' as const }));
  app.get('/ready', async () => ({ service: 'api', status: 'ready' as const }));

  return app;
};
