import { createServer } from 'http';
import { app } from './app';
import { config } from './config';
import { prisma } from './infrastructure/db/prismaClient';

const server = createServer(app);

server.listen(config.port, () => {
  console.log(`[DXC-API] Écoute sur le port ${config.port} (${config.nodeEnv})`);
});

async function shutdown() {
  console.log('[DXC-API] Arrêt en cours…');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
