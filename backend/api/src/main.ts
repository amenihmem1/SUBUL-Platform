import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, urlencoded } from 'express';
import cookieParser = require('cookie-parser');

/** Dev + local API origins always allowed */
const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const DEFAULT_PRODUCTION_CORS_ORIGINS = [
  'https://app.subul.uk',
  'https://subul.uk',
  'https://www.subul.uk',
];

function addDerivedFrontendOrigins(url: URL, origins: Set<string>): void {
  origins.add(url.origin);
  const host = url.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return;
  if (!host.startsWith('www.')) {
    origins.add(`${url.protocol}//www.${host}`);
  } else {
    origins.add(`${url.protocol}//${host.replace(/^www\./, '')}`);
  }
  if (!host.startsWith('app.')) {
    const bare = host.replace(/^www\./, '');
    const labels = bare.split('.');
    if (labels.length >= 2) {
      const apex = labels.slice(-2).join('.');
      origins.add(`${url.protocol}//app.${apex}`);
    }
  }
}

/** FRONTEND_URL + optional CORS_ORIGINS (comma-separated) + sensible www/app variants */
function collectCorsAllowedOrigins(): string[] {
  const set = new Set<string>([
    ...DEFAULT_DEV_CORS_ORIGINS,
    ...DEFAULT_PRODUCTION_CORS_ORIGINS,
  ]);
  const fe = process.env.FRONTEND_URL?.trim();
  if (fe) {
    try {
      addDerivedFrontendOrigins(new URL(fe), set);
    } catch {
      /* ignore invalid FRONTEND_URL */
    }
  }
  const extra = process.env.CORS_ORIGINS?.trim();
  if (extra) {
    for (const piece of extra.split(',')) {
      const s = piece.trim();
      if (!s) continue;
      try {
        const withProto = s.includes('://') ? s : `https://${s}`;
        set.add(new URL(withProto).origin);
      } catch {
        /* ignore bad entry */
      }
    }
  }
  return [...set];
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // Trust all loopback + private-range IPs as proxies (covers Docker bridge,
  // AWS ALB, kube-proxy, and any EKS VPC hop). With this set, Express computes
  // req.ip as the first *public* IP in the X-Forwarded-For chain, which is the
  // real client IP forwarded by the ALB.
  app.set('trust proxy', ['loopback', 'uniquelocal']);

  // Allow large JSON bodies (e.g. base64 images from lab assistant)
  app.use(json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // Set a global API prefix for all routes
  //app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const corsAllowedOrigins = new Set(collectCorsAllowedOrigins());
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (corsAllowedOrigins.has(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Forwarded-For',
      'Idempotency-Key',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Subul Platform API')
    .setDescription(
      'API REST de la plateforme e-learning Subul.\n\n' +
      '**Base URL** : toutes les routes sont préfixées par `/api`.\n\n' +
      '**Authentification** : JWT Bearer token (POST /api/auth/login ou /api/auth/register).\n\n' +
      '| Module | Base URL |\n|--------|----------|\n' +
      '| Auth | `/api/auth` |\n' +
      '| Users | `/api/users` |\n' +
      '| Goals | `/api/goals` |\n' +
      '| Courses | `/api/courses` |\n' +
      '| Quiz Results | `/api/quiz-results` |\n' +
      '| Roadmap | `/api/roadmap` |\n' +
      '| Admin | `/api/admin` |\n' +
      '| Employer | `/api/employer` |',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT Bearer token' })
    .addTag('App', 'Health check et reporting d\'erreurs client')
    .addTag('Auth', 'Authentification locale et gestion de session JWT')
    .addTag('Certifications', 'Gestion et inscription aux certifications')
    .addTag('Companies', 'Gestion des entreprises (admin)')
    .addTag('Courses', 'Contenu des cours et progression des apprenants')
    .addTag('Exams', 'Examen et streak')
    .addTag('Goals', 'Objectifs personnels (journaliers, hebdomadaires, globaux)')
    .addTag('Jobs', 'Offres d\'emploi')
    .addTag('Labs', 'Labs pratiques cloud')
    .addTag('Learner', 'Tableau de bord apprenant')
    .addTag('Employer', 'Tableau de bord employeur')
    .addTag('Quiz Results', "Résultats d'assessment et tests de niveau")
    .addTag('Roadmap', 'Roadmap de certifications personnalisé')
    .addTag('Users', 'Gestion des utilisateurs (profil + CRUD admin)')
    .addTag('Admin', 'Administration plateforme')
    .addServer('http://localhost:3001', 'Développement local')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Only expose Swagger UI outside production — it leaks the full API surface.
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
      },
      customSiteTitle: 'Subul API Docs',
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Let NestJS respond to SIGTERM/SIGINT so TypeORM, Redis, and WebSocket
  // connections close cleanly during rolling deploys. Without this, Kubernetes
  // sends SIGKILL after terminationGracePeriodSeconds and connections leak.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3001);

  // Align Node server timeouts with AWS ALB max idle timeout (4000s).
  // Ensure Nest doesn't drop long-running agent proxy requests before the ALB.
  const server = app.getHttpServer();
  if (server && typeof server === 'object') {
    // Slightly above ALB idle timeout (4,000,000ms).
    (server as any).keepAliveTimeout = 4_200_000;
    (server as any).headersTimeout = 4_200_000;
    // Keep overall socket timeout just under keepAlive/headers timeouts.
    (server as any).timeout = 4_100_000;
  }

  console.log(`🚀 API running on http://localhost:${process.env.PORT ?? 3001}`);
  console.log(`📚 Swagger docs → http://localhost:${process.env.PORT ?? 3001}/docs`);
}
bootstrap();
