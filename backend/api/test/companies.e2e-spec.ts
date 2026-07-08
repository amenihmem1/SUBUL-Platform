import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getAdminToken, authHeaders } from './utils/e2e-helpers';

describe('CompaniesController (e2e)', () => {
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

  describe('GET /api/admin/companies', () => {
    it('returns 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/companies')
        .set(headers())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/companies', () => {
    it('returns 201 with company', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/companies')
        .set(headers())
        .send({ name: 'E2E Co', email: 'e2e@test.com', status: 'active' })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('E2E Co');
      expect(Array.isArray(res.body.employees)).toBe(true);
    });
  });

  describe('CRUD flow', () => {
    let companyId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/companies')
        .set(headers())
        .send({ name: 'CRUD Co', email: 'crud@test.com' });
      companyId = res.body.id;
    });

    it('GET /api/admin/companies/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/companies/${companyId}`)
        .set(headers())
        .expect(200);
      expect(res.body.id).toBe(companyId);
    });

    it('PATCH /api/admin/companies/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/companies/${companyId}`)
        .set(headers())
        .send({ name: 'Updated Co' })
        .expect(200);
      expect(res.body.name).toBe('Updated Co');
    });

    it('POST /api/admin/companies/:id/employees returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/admin/companies/${companyId}/employees`)
        .set(headers())
        .send({ name: 'Jane', email: 'jane@test.com', position: 'Dev' })
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Jane');
    });

    it('PATCH .../employees/:employeeId/status returns 200', async () => {
      const getRes = await request(app.getHttpServer())
        .get(`/api/admin/companies/${companyId}`)
        .set(headers());
      const employeeId = getRes.body.employees?.[0]?.id;
      if (!employeeId) return;
      await request(app.getHttpServer())
        .patch(`/api/admin/companies/${companyId}/employees/${employeeId}/status`)
        .set(headers())
        .send({ status: 'active' })
        .expect(200);
    });

    it('DELETE /api/admin/companies/:id returns 200', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/companies/${companyId}`)
        .set(headers())
        .expect(200);
    });
  });
});
