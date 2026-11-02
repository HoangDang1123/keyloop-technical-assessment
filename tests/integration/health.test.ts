import { describe, it, expect } from 'vitest';
import { request } from '../helpers';

describe('GET /health', () => {
  it('should return 200 with status ok and timestamp', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data).toHaveProperty('timestamp');
  });
});
