import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('error', (e) => {
  logger.error({ prismaError: e }, 'Prisma client error');
});

prisma.$on('warn', (e) => {
  logger.warn({ prismaWarning: e }, 'Prisma client warning');
});

/**
 * Gracefully disconnect Prisma on process exit.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
}
