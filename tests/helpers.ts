import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { seedDatabase } from '../prisma/seed';
import supertest from 'supertest';

export const app = createApp();
export const request = supertest(app);

/**
 * Ensures domain reference tables are populated before test execution.
 * Only seeds if the tables are completely empty.
 */
export async function ensureDomainSeed(): Promise<void> {
  const dealershipCount = await prisma.dealership.count();
  if (dealershipCount === 0) {
    await seedDatabase(prisma);
  }
}

/**
 * Resets ONLY the Appointment table for test isolation.
 * Preserves all other seven domain tables: Customer, Vehicle, Dealership,
 * ServiceType, Technician, TechnicianQualification, and ServiceBay.
 *
 * Recreates the baseline appointment fixture required for overlap and
 * concurrency testing:
 * - Dealership 1: Brake Inspection (60m) from 2026-11-05T10:00:00.000Z to 11:00:00.000Z
 *   assigned to Tech 2 (Diana Prince) and Bay 1 (Bay A).
 */
export async function resetAppointments(): Promise<void> {
  // TRUNCATE ONLY the Appointment table
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Appointment" RESTART IDENTITY;');

  // Query baseline IDs to avoid hardcoded mismatch
  const tech2 = await prisma.technician.findFirst({
    where: { dealershipId: 1, name: 'Diana Prince' },
  });
  const bayA = await prisma.serviceBay.findFirst({
    where: { dealershipId: 1, name: 'Bay A' },
  });
  const brakeService = await prisma.serviceType.findFirst({
    where: { name: 'Brake Inspection' },
  });
  const customer1 = await prisma.customer.findFirst({
    where: { email: 'alice.johnson@example.com' },
  });
  const vehicle1 = await prisma.vehicle.findFirst({
    where: { customerId: customer1?.id },
  });

  if (tech2 && bayA && brakeService && customer1 && vehicle1) {
    await prisma.appointment.create({
      data: {
        customerId: customer1.id,
        vehicleId: vehicle1.id,
        dealershipId: 1,
        serviceTypeId: brakeService.id,
        technicianId: tech2.id,
        serviceBayId: bayA.id,
        startTime: new Date('2026-11-05T10:00:00.000Z'),
        endTime: new Date('2026-11-05T11:00:00.000Z'),
        status: 'CONFIRMED',
      },
    });
  }
}

// Backward-compatible alias for existing tests
export const resetDatabase = resetAppointments;
