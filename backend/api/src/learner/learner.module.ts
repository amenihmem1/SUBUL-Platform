import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnerController } from './learner.controller';
import { LearnerService } from './learner.service';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { Goal } from '../goals/entities/goal.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import { LabsModule } from '../labs/labs.module';
import { LearnerAssignmentsModule } from '../learner-assignments/learner-assignments.module';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { ExamAttempt } from '../exams/entities/exam-attempt.entity';

@Module({
  imports: [
    AuthModule,
    SubscriptionsModule,
    UsersModule,
    CoursesModule,
    CertificationsModule,
    LabsModule,
    LearnerAssignmentsModule,
    TypeOrmModule.forFeature([Goal, AssessmentResult, UserCourseProgress, LabProgress, ExamAttempt]),
  ],
  controllers: [LearnerController],
  providers: [LearnerService],
  exports: [LearnerService],
})
export class LearnerModule {}
