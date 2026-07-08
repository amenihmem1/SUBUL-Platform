import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationsService } from './certifications.service';
import { CertificationsController } from './certifications.controller';
import { CertificatesPublicController } from './certificates-public.controller';
import { Certification } from './entities/certification.entity';
import { IssuedCertificate } from './entities/issued-certificate.entity';
import { Course } from '../courses/entities/course.entity';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { User } from '../users/entities/user.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { LessonTranslation } from '../courses/entities/lesson-translation.entity';
import { Lab as CourseLab } from '../courses/entities/lab.entity';
import { Lab as InteractiveLab } from '../labs/entities/lab.entity';
import { AuthModule } from '../auth/auth.module';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { CertifCoursesImportService } from './certif-courses-import.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { CertificationPath } from './entities/certification-path.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import { PracticeExam } from '../practice-exams/entities/practice-exam.entity';
import { PracticeExamAttempt } from '../practice-exams/entities/practice-exam-attempt.entity';
import { CourseCompletionCertificate } from './entities/course-completion-certificate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certification,
      IssuedCertificate,
      Course,
      UserCourseProgress,
      User,
      CourseModule,
      Lesson,
      LessonTranslation,
      CourseLab,
      InteractiveLab,
      LabProgress,
      CertificationPath,
      AssessmentResult,
      PracticeExam,
      PracticeExamAttempt,
      CourseCompletionCertificate,
    ]),
    AuthModule,
    forwardRef(() => CoursesModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [CertificationsController, CertificatesPublicController],
  providers: [CertificationsService, CertifCoursesImportService, CertificatePdfService],
  exports: [CertificationsService, CertifCoursesImportService],
})
export class CertificationsModule {}