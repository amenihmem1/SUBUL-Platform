import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { resolve } from 'path';
import { envValidationSchema } from './config/env.validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsModule } from './certifications/certifications.module';
import { CoursesModule } from './courses/courses.module';
import { QuizResultsModule } from './quiz-results/quiz-results.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GoalsModule } from './goals/goals.module';
import { ExamsModule } from './exams/exams.module';
import { JobsModule } from './jobs/jobs.module';
import { LearnerModule } from './learner/learner.module';
import { AdminModule } from './admin/admin.module';
import { EmployerModule } from './employer/employer.module';
import { LabsModule } from './labs/labs.module';
import { CompaniesModule } from './companies/companies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AgentsModule } from './agents/agents.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UniversityModule } from './university/university.module';
import { LearnerEmploiModule } from './learner-emploi/learner-emploi.module';
import { MailModule } from './mail/mail.module';
import { GeoModule } from './geo/geo.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { PaymentsModule } from './payments/payments.module';
import { QuoteRequestsModule } from './quote-requests/quote-requests.module';
import { UserCvModule } from './user-cv/user-cv.module';
import { CommercialModule } from './commercial/commercial.module';
import { ManualPaymentsModule } from './manual-payments/manual-payments.module';
import { ReferralsModule } from './referrals/referrals.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContentIndexerModule } from './content-indexer/content-indexer.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PracticeExamsModule } from './practice-exams/practice-exams.module';
import { ContentImportModule } from './content-import/content-import.module';
import { UsageModule } from './usage/usage.module';
import { HeygenModule } from './heygen/heygen.module';
import { LabAccessModule } from './lab-access/lab-access.module';
import { QuizFeedbackModule } from './quiz-feedback/quiz-feedback.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrometheusModule.register({ defaultMetrics: { enabled: true }, path: '/metrics' }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Repo root `.env` first so it wins on duplicate keys (Nest merges with Object.assign(parse(file), previous)).
      // Azure mail vars are often only in the monorepo root `.env`.
      envFilePath: [
        resolve(__dirname, '../../../.env.local'),
        resolve(__dirname, '../../../.env'),
        resolve(__dirname, '../../.env.local'),
        resolve(__dirname, '../../.env'),
        '.env.local',
        '.env',
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const portRaw = configService.get<string>('DB_PORT') ?? '5434';
        const port = Number.parseInt(portRaw, 10);
        const sslEnabled = (configService.get<string>('DB_SSL') ?? '').toLowerCase() === 'true';

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: Number.isFinite(port) ? port : 5434,
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'shared_db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          migrationsRun: configService.get<string>('NODE_ENV') === 'production',
          logging: ['error'],
          migrations: [__dirname + '/migrations/*.js'],
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          extra: {
            connectionTimeoutMillis: 10000,
          },
        };
      },
    }),
    AuthModule,
    CertificationsModule,
    QuizResultsModule,
    RoadmapModule,
    UsersModule,
    GoalsModule,
    CoursesModule,
    ExamsModule,
    JobsModule,
    LearnerModule,
    AdminModule,
    EmployerModule,
    LabsModule,
    CompaniesModule,
    NotificationsModule,
    AgentsModule,
    SubscriptionsModule,
    UniversityModule,
    LearnerEmploiModule,
    MailModule,
    GeoModule,
    PromoCodesModule,
    PaymentsModule,
    QuoteRequestsModule,
    UserCvModule,
    CommercialModule,
    ManualPaymentsModule,
    ReferralsModule,
    ContentIndexerModule,
    PracticeExamsModule,
    ContentImportModule,
    UsageModule,
    LabAccessModule,
    QuizFeedbackModule,
    HeygenModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Agent proxy metrics (NestJS proxy layer to Python agents)
    makeCounterProvider({ name: 'agent_proxy_requests_total',     help: 'Agent proxy request counts',      labelNames: ['agent', 'status'] }),
    makeHistogramProvider({ name: 'agent_proxy_duration_seconds', help: 'Agent proxy latency in seconds',  labelNames: ['agent'], buckets: [0.1, 0.5, 1, 2, 5, 10, 30] }),
  ],
})
export class AppModule {
}