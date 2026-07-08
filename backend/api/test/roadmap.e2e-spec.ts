import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('RoadmapController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/roadmap', () => {
    it('returns 410 (Deprecated)', async () => {
      await request(app.getHttpServer())
        .get('/api/roadmap')
        .set(authHeaders(token))
        .expect(410);
    });
  });

  describe('POST /api/roadmap/generate', () => {
    it('returns 410 (Deprecated)', async () => {
      await request(app.getHttpServer())
        .post('/api/roadmap/generate')
        .set(authHeaders(token))
        .expect(410);
    });
  });

  describe('GET /api/roadmap/analytics', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/roadmap/analytics')
        .set(authHeaders(token))
        .expect(200);
    });
  });

  describe('GET /api/roadmap/recommendations', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/roadmap/recommendations')
        .set(authHeaders(token))
        .expect(200);
    });
  });
});
