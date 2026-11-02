import { beforeAll, afterAll } from 'vitest';
import { disconnectPrisma } from '../src/lib/prisma';

beforeAll(async () => {
  // Test setup placeholder
});

afterAll(async () => {
  await disconnectPrisma();
});
