import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminSubscriptionsController, AdminUserSubscriptionsController } from './admin-subscriptions.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { QuizResultsModule } from '../quiz-results/quiz-results.module';
import { PlatformModule } from '../platform/platform.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UniversityModule } from '../university/university.module';
import { CompaniesModule } from '../companies/companies.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { LearnerAssignmentsModule } from '../learner-assignments/learner-assignments.module';
import { AdminLearnersController } from './admin-learners.controller';
import { User } from '../users/entities/user.entity';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { IssuedCertificate } from '../certifications/entities/issued-certificate.entity';
import { ContentIndexerModule } from '../content-indexer/content-indexer.module';
import { AdminContentIndexerController } from './admin-content-indexer.controller';
import { ContentImportModule } from '../content-import/content-import.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { LabsModule } from '../labs/labs.module';
import { AdminContentController } from './admin-content.controller';
import { PracticeExamsModule } from '../practice-exams/practice-exams.module';
import { AdminPracticeExamsController } from './admin-practice-exams.controller';
import { LabAccessModule } from '../lab-access/lab-access.module';
import { AdminLabAccessController } from './admin-lab-access.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CoursesModule,
    QuizResultsModule,
    PlatformModule,
    SubscriptionsModule,
    UniversityModule,
    CompaniesModule,
    PaymentsModule,
    LearnerAssignmentsModule,
    ContentIndexerModule,
    ContentImportModule,
    CertificationsModule,
    LabsModule,
    PracticeExamsModule,
    LabAccessModule,
    TypeOrmModule.forFeature([User, UserCourseProgress, LabProgress, IssuedCertificate]),
  ],
  controllers: [
    AdminController,
    AdminCoursesController,
    AdminSubscriptionsController,
    AdminUserSubscriptionsController,
    AdminPaymentsController,
    AdminLearnersController,
    AdminContentIndexerController,
    AdminContentController,
    AdminPracticeExamsController,
    AdminLabAccessController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
