import request from 'supertest';
import app from '../src/app.js';

describe('Server Foundation API Tests', () => {
  it('GET / returns API welcome metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pixel Forge API');
    expect(res.body.docs).toBe('/api/docs');
  });

  it('GET /api/health returns upgraded success envelope with status, time, uptimeSec, and db', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.time).toBe('string');
    expect(typeof res.body.data.uptimeSec).toBe('number');
    expect(['connected', 'disconnected']).toContain(res.body.data.db);
  });

  it('GET /api/does-not-exist returns 404 NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Route not found: GET /api/does-not-exist');
  });
});
