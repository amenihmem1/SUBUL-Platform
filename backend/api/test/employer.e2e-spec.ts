import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getEmployerToken, authHeaders } from './utils/e2e-helpers';

describe('EmployerController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getEmployerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/employer/dashboard', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employer/dashboard')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/employer/jobs', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employer/jobs')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/employer/candidates', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employer/candidates')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/employer/interviews', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employer/interviews')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/employer/company', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/employer/company')
        .set(authHeaders(token))
        .expect(200);
    });
  });
});
