import { createClient } from 'redis';
import { REDIS_URL } from './env';

export async function setupRedis() {
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  subClient.subscribe('chat', (message) => {
    console.log('Message from Redis channel: ', message);  
  });

  pubClient.on('error', (err) => {
    console.error('PubClient Error:', err);
  });

  subClient.on('error', (err) => {
    console.error('SubClient Error:', err);
  });

  process.on('SIGINT', async () => {
    await pubClient.quit();
    await subClient.quit();
    console.log('Redis clients disconnected.');
    process.exit(0);
  });

  return { pubClient, subClient };
}
