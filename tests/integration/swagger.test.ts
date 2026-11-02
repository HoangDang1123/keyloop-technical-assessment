import { describe, it, expect } from 'vitest';
import { request } from '../helpers';

describe('Swagger UI & OpenAPI Specification', () => {
  it('should serve Swagger UI at GET /api-docs/', async () => {
    const res = await request.get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON specification at GET /api-docs/openapi.json', async () => {
    const res = await request.get('/api-docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.3');
    expect(res.body.info.title).toBe('Keyloop Unified Service Scheduler API');
    expect(res.body.paths).toHaveProperty('/api/v1/appointments');
    expect(res.body.paths).toHaveProperty('/api/v1/availability');
    expect(res.body.paths).toHaveProperty('/api/v1/service-types');
    expect(res.body.paths).toHaveProperty('/health');
  });

  it('should serve OpenAPI YAML specification at GET /api-docs/openapi.yaml', async () => {
    const res = await request.get('/api-docs/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('yaml');
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('/api/v1/appointments');
  });
});
