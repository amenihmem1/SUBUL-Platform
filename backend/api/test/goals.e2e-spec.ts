import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('GoalsController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const createGoalDto = {
    title: 'E2E Test Goal',
    description: 'Test description',
    category: 'certification',
    priority: 'high',
    successCriteria: 'Complete test',
    deadline: '2025-12-31T00:00:00.000Z',
    motivation: 'E2E test',
    milestones: ['Step 1', 'Step 2'],
  };

  describe('GET /api/goals', () => {
    it('returns 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/goals', () => {
    it('returns 201 with goal object', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/goals')
        .set(authHeaders(token))
        .send(createGoalDto)
        .expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe(createGoalDto.title);
      expect(res.body.category).toBe(createGoalDto.category);
    });
  });

  describe('GET /api/goals/stats', () => {
    it('returns 200 with stats object', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/stats')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('onTrack');
      expect(res.body).toHaveProperty('behind');
    });
  });

  describe('Goals CRUD', () => {
    let goalId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/goals')
        .set(authHeaders(token))
        .send(createGoalDto)
        .expect(201);
      goalId = res.body.id;
      expect(goalId).toBeDefined();
    });

    it('GET /api/goals/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/goals/${goalId}`)
        .set(authHeaders(token))
        .expect(200);
      expect(res.body.id).toBe(goalId);
    });

    it('PATCH /api/goals/:id returns 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/goals/${goalId}`)
        .set(authHeaders(token))
        .send({ title: 'Updated Goal Title' })
        .expect(200);
      expect(res.body.title).toBe('Updated Goal Title');
    });

    it('DELETE /api/goals/:id returns 200', async () => {
      await request(app.getHttpServer())
        .delete(`/api/goals/${goalId}`)
        .set(authHeaders(token))
        .expect(200);
    });
  });

  describe('Daily goals', () => {
    it('GET /api/goals/daily returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/daily')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/goals/daily/today returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/daily/today')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/goals/daily/stats returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/daily/stats')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('points');
    });
  });

  describe('Weekly goals', () => {
    it('GET /api/goals/weekly returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/weekly')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/goals/weekly/current returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/goals/weekly/current')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/goals/weekly/current/stats returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/goals/weekly/current/stats')
        .set(authHeaders(token))
        .expect(200);
    });
  });
});
