import { describe, it, expect, beforeEach } from 'vitest';
import { request, resetDatabase } from '../helpers';
import { prisma } from '../../src/lib/prisma';

describe('Concurrency Safety Integration Test', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('11. should confirm at most ONE appointment and reject all concurrent overlapping requests under real PostgreSQL advisory locks', async () => {
    // Dealership 2 has exactly 1 technician (Frank Castle) and 1 service bay (Bay C)
    const dealershipId = 2;
    const serviceTypeId = 1; // Oil Change (30 minutes)
    const customerId = 2; // Bob Smith
    const vehicleId = 3;  // Ford F-150

    // Fire 5 concurrent requests attempting to book overlapping slots
    const concurrentRequests = [
      { startTime: '2026-11-12T10:00:00.000Z' },
      { startTime: '2026-11-12T10:00:00.000Z' },
      { startTime: '2026-11-12T10:10:00.000Z' },
      { startTime: '2026-11-12T10:15:00.000Z' },
      { startTime: '2026-11-12T10:20:00.000Z' },
    ];

    const responses = await Promise.all(
      concurrentRequests.map((reqPayload) =>
        request.post('/api/v1/appointments').send({
          customerId,
          vehicleId,
          dealershipId,
          serviceTypeId,
          startTime: reqPayload.startTime,
        }),
      ),
    );

    const successfulBookings = responses.filter((res) => res.status === 201);
    const conflictBookings = responses.filter((res) => res.status === 409);

    // CRITICAL ASSERTION: Exactly ONE booking must succeed
    expect(successfulBookings.length).toBe(1);

    // All other 4 overlapping attempts must be rejected with 409 Conflict
    expect(conflictBookings.length).toBe(4);

    conflictBookings.forEach((conflict) => {
      expect(['NO_TECHNICIAN_AVAILABLE', 'NO_SERVICE_BAY_AVAILABLE']).toContain(
        conflict.body.error.code,
      );
    });

    // Double-check the actual database state:
    // Query appointments for Dealership 2 in this timeframe
    const persistedAppointments = await prisma.appointment.findMany({
      where: {
        dealershipId: 2,
        startTime: { gte: new Date('2026-11-12T09:00:00.000Z') },
        endTime: { lte: new Date('2026-11-12T12:00:00.000Z') },
      },
    });

    // Assert database integrity: no double booking
    expect(persistedAppointments.length).toBe(1);
    expect(persistedAppointments[0].id).toBe(successfulBookings[0].body.data.id);
  });
});
