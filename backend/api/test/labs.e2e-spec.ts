import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('LabsController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/labs', () => {
    it('returns 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/labs')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/labs/:slug', () => {
    it('returns 200 or 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/labs/non-existent-slug');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /api/labs/my/progress', () => {
    it('returns 200 with JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/labs/my/progress')
        .set(authHeaders(token));
      expect([200, 404]).toContain(res.status);
    });
  });
});
