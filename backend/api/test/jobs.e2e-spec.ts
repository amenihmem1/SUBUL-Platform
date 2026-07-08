import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getEmployerToken, getAdminToken, authHeaders } from './utils/e2e-helpers';

describe('JobsController (e2e)', () => {
  let app: INestApplication;
  let employerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    employerToken = await getEmployerToken(app);
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/jobs (Employer)', () => {
    it('creates a job and returns 201', async () => {
      const dto = {
        title: 'E2E Full Stack Developer',
        domain: 'devops',
        location: 'Tunis',
        salary: 60000,
        description: 'Testing the job creation flow with proper authentication.',
        skills: ['Node.js', 'PostgreSQL'],
      };

      const res = await request(app.getHttpServer())
        .post('/api/jobs')
        .set(authHeaders(employerToken))
        .send(dto)
        .expect(201);

      expect(res.body.job).toBeDefined();
      expect(res.body.job.id).toBeDefined();
      expect(res.body.job.status).toBe('pending');
      expect(res.body.message).toBe('Offre soumise et en attente de validation');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/jobs')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/jobs (Public)', () => {
    it('returns list of published jobs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/jobs')
        .expect(200);
      
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Admin Job Review Flow', () => {
    it('allows admin to publish a job', async () => {
      // 1. Create a job as employer
      const createRes = await request(app.getHttpServer())
        .post('/api/jobs')
        .set(authHeaders(employerToken))
        .send({
          title: 'Review Test Job',
          domain: 'ai',
          description: 'Testing admin review',
        });
      const jobId = createRes.body.job.id;

      // 2. Approve as admin
      await request(app.getHttpServer())
        .patch(`/api/admin/jobs/${jobId}/status`)
        .set(authHeaders(adminToken))
        .send({ status: 'published', adminNotes: 'Looks good' })
        .expect(200);

      // 3. Verify status
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}`)
        .expect(200);
      expect(verifyRes.body.status).toBe('published');
    });

    it('returns 400 when admin tries to accept/reject a non-pending job', async () => {
      // Create and publish a job first
      const createRes = await request(app.getHttpServer())
        .post('/api/jobs')
        .set(authHeaders(employerToken))
        .send({ title: 'Already Published Job', domain: 'cloud' });
      const jobId = createRes.body.job.id;
      await request(app.getHttpServer())
        .patch(`/api/admin/jobs/${jobId}/status`)
        .set(authHeaders(adminToken))
        .send({ status: 'published' })
        .expect(200);

      // Try to publish again (job is already published)
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/jobs/${jobId}/status`)
        .set(authHeaders(adminToken))
        .send({ status: 'published' })
        .expect(400);
      expect(res.body.message).toMatch(/en attente|pending/i);
    });
  });

  describe('Employer job ownership and status', () => {
    it('created job has companyId when employer has company', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/jobs')
        .set(authHeaders(employerToken))
        .send({
          title: 'Job With Company',
          domain: 'ai',
          description: 'Employer with companyName gets companyId',
        })
        .expect(201);
      // getEmployerToken registers with companyName, so user has companyId
      expect(res.body.job).toBeDefined();
      expect(res.body.job.companyId).toBeDefined();
      expect(res.body.job.employerId).toBeDefined();
    });

    it('employer PATCH cannot set status to published (status is ignored)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/jobs')
        .set(authHeaders(employerToken))
        .send({ title: 'Pending Job For Edit', domain: 'devops' })
        .expect(201);
      const jobId = createRes.body.job.id;
      expect(createRes.body.job.status).toBe('pending');

      // Employer sends status: 'published' in body - backend must ignore it
      await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}`)
        .set(authHeaders(employerToken))
        .send({ title: 'Updated Title', status: 'published' })
        .expect(200);

      const getRes = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}`)
        .expect(200);
      // Job should still be pending (employer cannot self-publish)
      expect(getRes.body.status).toBe('pending');
      expect(getRes.body.title).toBe('Updated Title');
    });
  });
});
