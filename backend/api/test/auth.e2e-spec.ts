import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const testEmail = `auth-test-${Date.now()}@e2e.test`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 201 with access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Auth Test User',
          role: 'learner',
        })
        .expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');
    });

    it('returns 400 on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'Duplicate',
          role: 'learner',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 or 201 with access_token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });
      expect([200, 201]).toContain(res.status);
      expect(res.body.access_token).toBeDefined();
    });

    it('returns 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPassword' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 200 with user object when authenticated', async () => {
      const token = await getLearnerToken(app);
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBeDefined();
      expect(res.body.role).toBeDefined();
    });

    it('returns 401 when no token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('GET /auth/logout', () => {
    it('returns 200 or 302', async () => {
      const res = await request(app.getHttpServer()).get('/auth/logout');
      expect([200, 302]).toContain(res.status);
    });
  });
});
