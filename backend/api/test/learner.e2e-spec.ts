import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('LearnerController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/learner/dashboard', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/learner/dashboard')
        .set(authHeaders(token))
        .expect(200);
    });
  });

  describe('GET /api/learner/courses', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/learner/courses')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
