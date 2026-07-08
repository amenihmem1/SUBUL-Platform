import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('ExamsController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/exams', () => {
    it('returns 200 with exams shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('upcoming');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('streak');
      expect(res.body).toHaveProperty('stats');
      expect(Array.isArray(res.body.upcoming)).toBe(true);
      expect(Array.isArray(res.body.completed)).toBe(true);
    });
  });

  describe('GET /api/exams/streak', () => {
    it('returns 200 with streak', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/exams/streak')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('streak');
    });
  });
});
