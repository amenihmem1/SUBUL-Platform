import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getLearnerToken, authHeaders } from './utils/e2e-helpers';

describe('QuizResultsController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getLearnerToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/quiz-results/assessment/latest', () => {
    it('returns 200 or 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quiz-results/assessment/latest')
        .set(authHeaders(token));
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /api/quiz-results/assessment/attempts-count', () => {
    it('returns 200 with attemptsCount number', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quiz-results/assessment/attempts-count')
        .set(authHeaders(token))
        .expect(200);
      expect(res.body).toHaveProperty('attemptsCount');
      expect(typeof res.body.attemptsCount).toBe('number');
      expect(res.body.attemptsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/quiz-results/assessment/history', () => {
    it('returns 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quiz-results/assessment/history')
        .set(authHeaders(token))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/quiz-results/assessment', () => {
    it('creates assessment result and returns 201', async () => {
      const payload = {
        quizType: 'assessment' as const,
        domain: 'cloud' as const,
        scores: { cloudPercentage: 70, cyberPercentage: 20, aiPercentage: 10 },
        primaryProfile: 'Cloud Architect',
        hybridProfiles: [],
      };
      const res = await request(app.getHttpServer())
        .post('/api/quiz-results/assessment')
        .set(authHeaders(token))
        .send(payload)
        .expect(201);
      expect(res.body).toBeDefined();
      expect(res.body.primaryProfile).toBe(payload.primaryProfile);
    });
  });

  describe('POST /api/quiz-results/level', () => {
    it('creates level result and returns 201', async () => {
      const payload = {
        domain: 'devops' as const,
        level: 'Intermédiaire' as const,
        score: { score: 10, total: 15, percentage: 66.7 },
        answers: { 1: 'A', 2: 'B' },
        questions: [
          { id: 1, domain: 'devops', question: 'Test?', difficulty: 'moyen', points: 1, correct: true },
        ],
      };
      const res = await request(app.getHttpServer())
        .post('/api/quiz-results/level')
        .set(authHeaders(token))
        .send(payload)
        .expect(201);
      expect(res.body).toBeDefined();
      expect(res.body.domain).toBe(payload.domain);
      expect(res.body.level).toBe(payload.level);
    });
  });

  describe('GET /api/quiz-results/level/latest', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/quiz-results/level/latest')
        .set(authHeaders(token))
        .expect(200);
    });
  });

  describe('GET /api/quiz-results/history', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/quiz-results/history')
        .set(authHeaders(token))
        .expect(200);
    });
  });

  describe('GET /api/quiz-results/roadmap', () => {
    it('returns 200', async () => {
      await request(app.getHttpServer())
        .get('/api/quiz-results/roadmap')
        .set(authHeaders(token))
        .expect(200);
    });
  });
});
