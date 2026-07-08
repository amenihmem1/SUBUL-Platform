import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users/me', () => {
    it('returns 200 with user object', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBeDefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('returns 200 with updated user', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .set(authHeaders(token))
        .send({ fullName: 'Updated Name' })
        .expect(200);
      expect(res.body.fullName).toBe('Updated Name');
    });
  });

  describe('POST /api/users/profile-picture', () => {
    it('returns 400 when no file uploaded', async () => {
      await request(app.getHttpServer())
        .post('/api/users/profile-picture')
        .set(authHeaders(token))
        .expect(400);
    });
  });
});
