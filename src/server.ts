import { buildServer } from './app';
import { PORT, HOST } from './config/env';

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server started at http://localhost:${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/documentation`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
