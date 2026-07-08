import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getEmployerToken, authHeaders } from './utils/e2e-helpers';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getEmployerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/notifications/employer', () => {
    it('returns notifications for the employer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/employer')
        .set(authHeaders(token))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/notifications/employer')
        .expect(401);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('marks a notification as read and returns 200', async () => {
      // 1. Get current notifications
      const getRes = await request(app.getHttpServer())
        .get('/api/notifications')
        .set(authHeaders(token));
      
      if (getRes.body.length > 0) {
        const notifId = getRes.body[0].id;
        await request(app.getHttpServer())
          .patch(`/api/notifications/${notifId}/read`)
          .set(authHeaders(token))
          .expect(200);
      }
    });
  });
});
