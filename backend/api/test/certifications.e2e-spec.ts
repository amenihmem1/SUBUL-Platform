import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, getAdminToken, authHeaders } from './utils/e2e-helpers';

describe('CertificationsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let learnerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAdminToken(app);
    learnerToken = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Admin routes', () => {
    describe('GET /api/admin/certifications', () => {
      it('returns 200 with admin token', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/certifications')
          .set(authHeaders(adminToken))
          .expect(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });
  });

  describe('Enroll / enrollment (learner token)', () => {
    it('POST /api/admin/certifications/:id/enroll returns 201 or 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/certifications/99999/enroll')
        .set(authHeaders(learnerToken));
      expect([201, 404]).toContain(res.status);
    });

    it('GET /api/admin/certifications/:id/enrollment returns 200 or 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/certifications/99999/enrollment')
        .set(authHeaders(learnerToken));
      expect([200, 404]).toContain(res.status);
    });
  });
});
