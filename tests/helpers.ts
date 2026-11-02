import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { seedDatabase } from '../prisma/seed';
import supertest from 'supertest';

export const app = createApp();
export const request = supertest(app);

/**
 * Resets the database to a known clean seed state for predictable test execution.
 */
export async function resetDatabase() {
  return seedDatabase(prisma);
}
