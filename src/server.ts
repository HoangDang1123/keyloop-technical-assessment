import { createApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `🚀 Keyloop Unified Service Scheduler running on port ${config.PORT}`,
  );
  logger.info(`📖 API docs available at http://localhost:${config.PORT}/api-docs`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(async () => {
    await disconnectPrisma();
    logger.info('Server shut down gracefully');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
