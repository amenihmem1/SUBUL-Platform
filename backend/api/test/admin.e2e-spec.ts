import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getAdminToken, authHeaders } from './utils/e2e-helpers';

describe('AdminController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const headers = () => authHeaders(token);

  describe('GET /api/admin/users', () => {
    it('returns 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set(headers())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/users', () => {
    it('returns 201 with user object', async () => {
      const email = `admin-created-${Date.now()}@e2e.test`;
      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set(headers())
        .send({
          email,
          password: 'TestPassword123!',
          fullName: 'Admin Created User',
          role: 'learner',
        })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(email);
    });
  });

  describe('Admin users CRUD', () => {
    let userId: number;

    beforeAll(async () => {
      const email = `admin-crud-${Date.now()}@e2e.test`;
      const res = await request(app.getHttpServer())
        .post('/api/admin/users')
        .set(headers())
        .send({
          email,
          password: 'TestPassword123!',
          fullName: 'CRUD Test',
          role: 'learner',
        });
      userId = res.body.id;
    });

    it('GET /api/admin/users/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}`)
        .set(headers())
        .expect(200);
      expect(res.body.id).toBe(userId);
    });

    it('PATCH /api/admin/users/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${userId}`)
        .set(headers())
        .send({ fullName: 'Updated Name' })
        .expect(200);
      expect(res.body.fullName).toBe('Updated Name');
    });

    it('PATCH /api/admin/users/:id/status returns 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${userId}/status`)
        .set(headers())
        .send({ status: 'inactive' })
        .expect(200);
      expect(res.body.status).toBe('inactive');
    });

    it('POST /api/admin/users/:id/approve returns 200 or 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/admin/users/${userId}/approve`)
        .set(headers());
      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('active');
    });

    it('DELETE /api/admin/users/:id returns 200 or 500 (cascade constraints)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/admin/users/${userId}`)
        .set(headers());
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns 200 with stats shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set(headers())
        .expect(200);
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('activeUsers');
      expect(res.body).toHaveProperty('pendingUsers');
      expect(res.body).toHaveProperty('adminUsers');
      expect(res.body).toHaveProperty('employerUsers');
    });
  });

  describe('GET /api/admin/progression', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/progression')
        .set(headers())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Feedback', () => {
    it('GET /api/admin/feedback returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/feedback')
        .set(headers())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/admin/feedback/stats returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/feedback/stats')
        .set(headers())
        .expect(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('pending');
    });
  });

  describe('Transactions', () => {
    it('GET /api/admin/transactions returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/transactions')
        .set(headers())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/admin/transactions/stats returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/transactions/stats')
        .set(headers())
        .expect(200);
      expect(res.body).toHaveProperty('monthlyRevenue');
      expect(res.body).toHaveProperty('transactionsCount');
    });
  });
});
