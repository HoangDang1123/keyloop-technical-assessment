import { beforeAll, afterAll } from 'vitest';
import { disconnectPrisma } from '../src/lib/prisma';
import { ensureDomainSeed, resetAppointments } from './helpers';

// Ensure test environment is active
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Ensure the 7 domain reference tables are populated
  await ensureDomainSeed();
  // Reset only Appointment table before starting test suite
  await resetAppointments();
});

afterAll(async () => {
  await disconnectPrisma();
});
