import { FastifyInstance } from 'fastify';
import { createAdapter } from '@socket.io/redis-adapter';
import { setupRedis } from '../config/redis';  

export async function configureRedisAdapter(app: FastifyInstance) {
  
  const { pubClient, subClient } = await setupRedis();
  app.io.adapter(createAdapter(pubClient, subClient));
  console.log('Redis adapter configured successfully');
}
