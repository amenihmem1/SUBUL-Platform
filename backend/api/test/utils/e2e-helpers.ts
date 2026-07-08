import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import request from 'supertest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  await app.init();
  return app;
}

export async function getLearnerToken(app: INestApplication): Promise<string> {
  const email = `test-learner-${Date.now()}@e2e.test`;
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'TestPassword123!',
      fullName: 'E2E Learner',
      role: 'learner',
    })
    .expect(201);
  expect(res.body.access_token).toBeDefined();
  return res.body.access_token;
}

export async function getAdminToken(app: INestApplication): Promise<string> {
  const email = `test-admin-${Date.now()}@e2e.test`;
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'TestPassword123!',
      fullName: 'E2E Admin',
      role: 'admin',
    })
    .expect(201);
  expect(res.body.access_token).toBeDefined();
  return res.body.access_token;
}

export async function getEmployerToken(app: INestApplication): Promise<string> {
  const email = `test-employer-${Date.now()}@e2e.test`;
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'TestPassword123!',
      fullName: 'E2E Employer',
      role: 'employer',
      companyName: 'E2E Test Corp',
    })
    .expect(201);
  expect(res.body.access_token).toBeDefined();
  return res.body.access_token;
}

export function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
