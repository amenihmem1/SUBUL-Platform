import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/e2e-helpers';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns Hello World!', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /api/errors accepts client error reports', () => {
    return request(app.getHttpServer())
      .post('/api/errors')
      .send({
        error: 'Test error',
        stack: 'Error: Test\n  at test.ts:1:1',
        url: 'http://localhost:3000/test',
      })
      .expect(204);
  });
});
