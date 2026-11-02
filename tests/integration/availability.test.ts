import { describe, it, expect, beforeEach } from 'vitest';
import { request, resetDatabase } from '../helpers';

describe('GET /api/v1/availability', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should return available = true when resources are free', async () => {
    const res = await request
      .get('/api/v1/availability')
      .query({
        dealershipId: 1,
        serviceTypeId: 1, // Oil Change (30m)
        startTime: '2026-11-05T09:00:00+07:00',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
    expect(res.body.data.dealershipId).toBe(1);
    expect(res.body.data.serviceTypeId).toBe(1);
    expect(res.body.data.serviceTypeName).toBe('Oil Change');
    expect(res.body.data.durationMinutes).toBe(30);
    expect(res.body.data.availableTechnicians).toBeGreaterThan(0);
    expect(res.body.data.availableServiceBays).toBeGreaterThan(0);
  });

  it('should return 400 when required query parameters are missing', async () => {
    const res = await request
      .get('/api/v1/availability')
      .query({
        dealershipId: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when dealership is not found', async () => {
    const res = await request
      .get('/api/v1/availability')
      .query({
        dealershipId: 9999,
        serviceTypeId: 1,
        startTime: '2026-11-05T09:00:00+07:00',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 when service type is not found', async () => {
    const res = await request
      .get('/api/v1/availability')
      .query({
        dealershipId: 1,
        serviceTypeId: 9999,
        startTime: '2026-11-05T09:00:00+07:00',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
