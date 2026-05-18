/**
 * API tests: health (public) and protected routes (401 without auth).
 * Run with: npm run test (from backend folder).
 * NODE_ENV=test so Firebase is not initialized.
 */
const request = require('supertest');

describe('API', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    const { app: appExport } = require('../server');
    app = appExport;
  });

  describe('GET /api/health', () => {
    it('returns 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Protected routes (require auth)', () => {
    it('GET /api/challans without Authorization returns 401', async () => {
      const res = await request(app).get('/api/challans');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/cameras without Authorization returns 401', async () => {
      const res = await request(app).get('/api/cameras');
      expect(res.status).toBe(401);
    });

    it('GET /api/users without Authorization returns 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });
});
