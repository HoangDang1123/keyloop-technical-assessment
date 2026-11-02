import { describe, it, expect, beforeEach } from 'vitest';
import { request, resetDatabase } from '../helpers';

describe('Appointments API (Integration)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // 1. Successful appointment creation
  it('1. should successfully create and persist a confirmed appointment with resources allocated', async () => {
    const payload = {
      customerId: 1,
      vehicleId: 1,
      dealershipId: 1,
      serviceTypeId: 1, // Oil Change (30 min)
      startTime: '2026-11-05T09:00:00.000Z',
    };

    const res = await request.post('/api/v1/appointments').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    const appointment = res.body.data;

    expect(appointment.customerId).toBe(1);
    expect(appointment.vehicleId).toBe(1);
    expect(appointment.dealershipId).toBe(1);
    expect(appointment.serviceTypeId).toBe(1);
    expect(appointment.status).toBe('CONFIRMED');
    expect(appointment.startTime).toBe('2026-11-05T09:00:00.000Z');
    expect(appointment.endTime).toBe('2026-11-05T09:30:00.000Z');
    expect(appointment.technicianId).toBeDefined();
    expect(appointment.serviceBayId).toBeDefined();
    expect(appointment.customer.name).toBe('Alice Johnson');
    expect(appointment.vehicle.make).toBe('Toyota');
    expect(appointment.dealership.name).toBe('Downtown Auto Center');
    expect(appointment.serviceType.name).toBe('Oil Change');
  });

  // 2. No available service bay
  it('2. should return 409 Conflict when no service bay is available', async () => {
    // Dealership 2 has only 1 service bay (Bay C) and 1 technician (Frank Castle)
    // Book the only slot first
    const firstBooking = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // 30 min
      startTime: '2026-11-06T10:00:00.000Z',
    });
    expect(firstBooking.status).toBe(201);

    // Now attempt a second booking at Dealership 2 for the exact same time
    const secondBooking = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1,
      startTime: '2026-11-06T10:00:00.000Z',
    });

    expect(secondBooking.status).toBe(409);
    // Since Dealership 2 has 1 tech and 1 bay, both are occupied;
    // service checks technician first or bay, returning a 409 conflict
    expect(['NO_TECHNICIAN_AVAILABLE', 'NO_SERVICE_BAY_AVAILABLE']).toContain(
      secondBooking.body.error.code,
    );
  });

  // 3. No available qualified technician
  it('3. should return 409 Conflict when no qualified technician is free', async () => {
    // Dealership 2 has only 1 technician (Frank Castle, techId=4)
    // Book Frank from 14:00 to 14:30
    const res1 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // Oil change
      startTime: '2026-11-06T14:00:00.000Z',
    });
    expect(res1.status).toBe(201);

    // Attempt overlapping booking
    const res2 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1,
      startTime: '2026-11-06T14:15:00.000Z',
    });
    expect(res2.status).toBe(409);
    expect(['NO_TECHNICIAN_AVAILABLE', 'NO_SERVICE_BAY_AVAILABLE']).toContain(
      res2.body.error.code,
    );
  });

  // 4. Technician qualification mismatch
  it('4. should return 409 Conflict when dealership has no technician qualified for requested service type', async () => {
    // Dealership 2 technician (Frank) is only qualified for Oil Change (1) and Brake Inspection (2)
    // ServiceType 3 is "Full Service" (120m). Frank is NOT qualified for it.
    const res = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 3, // Full Service
      startTime: '2026-11-07T09:00:00.000Z',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NO_TECHNICIAN_AVAILABLE');
    expect(res.body.error.message).toContain('No qualified technician available');
  });

  // 5. Partial appointment overlap
  it('5. should reject appointment that partially overlaps existing booking', async () => {
    // Dealership 2: 1 tech, 1 bay
    // Create base appointment: 10:00 - 11:00 UTC (Brake Inspection, 60m)
    const base = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 2, // 60 min
      startTime: '2026-11-08T10:00:00.000Z',
    });
    expect(base.status).toBe(201);

    // Partial overlap 1: starts inside existing slot (10:30 - 11:00 UTC)
    const overlap1 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // 30 min -> 10:30 to 11:00
      startTime: '2026-11-08T10:30:00.000Z',
    });
    expect(overlap1.status).toBe(409);

    // Partial overlap 2: starts before and ends inside existing slot (09:45 - 10:15 UTC)
    const overlap2 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // 30 min -> 09:45 to 10:15
      startTime: '2026-11-08T09:45:00.000Z',
    });
    expect(overlap2.status).toBe(409);
  });

  // 6. Full appointment overlap
  it('6. should reject appointment that fully engulfs or is engulfed by an existing booking', async () => {
    // Dealership 2: 1 tech, 1 bay
    // Base booking: 10:00 - 10:30 (Oil Change, 30 min)
    const base = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1,
      startTime: '2026-11-09T10:00:00.000Z',
    });
    expect(base.status).toBe(201);

    // Full overlap: 09:30 - 10:30 (Brake Inspection 60 min)
    const engulfing = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 2,
      startTime: '2026-11-09T09:30:00.000Z',
    });
    expect(engulfing.status).toBe(409);
  });

  // 7. Adjacent appointments
  it('7. should allow strictly adjacent appointments [10:00, 10:30) and [10:30, 11:00)', async () => {
    // Dealership 2: 1 tech, 1 bay
    // First slot: 10:00 - 10:30
    const appt1 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // 30 min
      startTime: '2026-11-10T10:00:00.000Z',
    });
    expect(appt1.status).toBe(201);
    expect(appt1.body.data.endTime).toBe('2026-11-10T10:30:00.000Z');

    // Adjacent slot: starts exactly at 10:30
    const appt2 = await request.post('/api/v1/appointments').send({
      customerId: 2,
      vehicleId: 3,
      dealershipId: 2,
      serviceTypeId: 1, // 30 min -> 10:30 to 11:00
      startTime: '2026-11-10T10:30:00.000Z',
    });
    expect(appt2.status).toBe(201);
    expect(appt2.body.data.startTime).toBe('2026-11-10T10:30:00.000Z');
    expect(appt2.body.data.endTime).toBe('2026-11-10T11:00:00.000Z');
  });

  // 8. Invalid request input
  it('8. should return 400 Bad Request on invalid request inputs', async () => {
    // Missing required fields
    const missingFields = await request.post('/api/v1/appointments').send({
      customerId: 1,
    });
    expect(missingFields.status).toBe(400);
    expect(missingFields.body.error.code).toBe('VALIDATION_ERROR');

    // Invalid datetime format
    const invalidDate = await request.post('/api/v1/appointments').send({
      customerId: 1,
      vehicleId: 1,
      dealershipId: 1,
      serviceTypeId: 1,
      startTime: 'not-a-date',
    });
    expect(invalidDate.status).toBe(400);

    // Negative ID
    const negativeId = await request.post('/api/v1/appointments').send({
      customerId: -1,
      vehicleId: 1,
      dealershipId: 1,
      serviceTypeId: 1,
      startTime: '2026-11-05T09:00:00.000Z',
    });
    expect(negativeId.status).toBe(400);

    // Past start time
    const pastTime = await request.post('/api/v1/appointments').send({
      customerId: 1,
      vehicleId: 1,
      dealershipId: 1,
      serviceTypeId: 1,
      startTime: '2020-01-01T00:00:00.000Z',
    });
    expect(pastTime.status).toBe(400);
    expect(pastTime.body.error.code).toBe('PAST_START_TIME');
  });

  // 9. Vehicle/customer mismatch
  it('9. should return 400 when vehicle does not belong to specified customer', async () => {
    // Vehicle 3 belongs to Customer 2 (Bob). Customer 1 is Alice.
    const res = await request.post('/api/v1/appointments').send({
      customerId: 1, // Alice
      vehicleId: 3,  // Bob's truck
      dealershipId: 1,
      serviceTypeId: 1,
      startTime: '2026-11-05T09:00:00.000Z',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VEHICLE_CUSTOMER_MISMATCH');
    expect(res.body.error.message).toContain('does not belong to customer');
  });

  // 10. Data persistence and correct entity relationships
  it('10. should persist appointment data and allow retrieval by ID with full entity relationships', async () => {
    const createRes = await request.post('/api/v1/appointments').send({
      customerId: 1,
      vehicleId: 2, // Honda Civic
      dealershipId: 1,
      serviceTypeId: 2, // Brake Inspection
      startTime: '2026-11-05T14:00:00.000Z',
    });

    expect(createRes.status).toBe(201);
    const createdId = createRes.body.data.id;

    // Fetch via GET /api/v1/appointments/:id
    const fetchRes = await request.get(`/api/v1/appointments/${createdId}`);

    expect(fetchRes.status).toBe(200);
    const appointment = fetchRes.body.data;

    expect(appointment.id).toBe(createdId);
    expect(appointment.customer).toBeDefined();
    expect(appointment.customer.email).toBe('alice.johnson@example.com');
    expect(appointment.vehicle).toBeDefined();
    expect(appointment.vehicle.model).toBe('Civic');
    expect(appointment.dealership).toBeDefined();
    expect(appointment.dealership.id).toBe(1);
    expect(appointment.serviceType).toBeDefined();
    expect(appointment.serviceType.name).toBe('Brake Inspection');
    expect(appointment.technician).toBeDefined();
    expect(appointment.technician.id).toBe(appointment.technicianId);
    expect(appointment.serviceBay).toBeDefined();
    expect(appointment.serviceBay.id).toBe(appointment.serviceBayId);
  });
});
