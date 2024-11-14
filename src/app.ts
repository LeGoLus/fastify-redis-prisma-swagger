import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import { configureRedisAdapter } from './socket/redis-adapter';
import { registerSocketEvents } from './socket/socket';
import { initializeSwagger } from './config/swagger';
import { CORS_ORIGIN } from './config/env';

export async function buildServer() {
  const app = fastify();

  await app.register(fastifyCors, { origin: CORS_ORIGIN });
  await app.register(fastifyIO, { cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] } });

  await initializeSwagger(app);
  
  await configureRedisAdapter(app);

  registerSocketEvents(app.io);

  return app;
}
