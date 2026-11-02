import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Prisma Database Connection', () => {
  it('should initialize Prisma Client', () => {
    expect(prisma).toBeDefined();
  });

  it('should connect to PostgreSQL successfully', async () => {
    await prisma.$connect();

    const result = await prisma.$queryRaw<
      Array<{ connected: number }>
    >`SELECT 1 AS connected`;

    expect(result[0].connected).toBe(1);
  });
});