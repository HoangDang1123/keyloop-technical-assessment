import { describe, it, expect } from 'vitest';
import { request } from '../helpers';

describe('GET /api/v1/service-types', () => {
  it('should return all available service types', async () => {
    const res = await request.get('/api/v1/service-types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const names = res.body.data.map((st: { name: string }) => st.name);
    expect(names).toContain('Oil Change');
    expect(names).toContain('Brake Inspection');
    expect(names).toContain('Full Service');
    expect(names).toContain('Tire Rotation');
  });
});
