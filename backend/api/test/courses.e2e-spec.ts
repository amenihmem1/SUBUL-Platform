import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('CoursesController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/courses/my-courses', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/courses/my-courses')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/courses/:courseId', () => {
    it('returns 200 or 404 for known course id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/courses/AZ-900-UNIFIED')
        .set(authHeaders(token));
      expect([200, 404]).toContain(res.status);
    });
  });
});
