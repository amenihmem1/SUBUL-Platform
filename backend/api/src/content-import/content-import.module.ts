import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertifCoursesImportService } from '../certifications/certif-courses-import.service';
import { Course } from '../courses/entities/course.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { LessonTranslation } from '../courses/entities/lesson-translation.entity';
import { Lab as CourseLab } from '../courses/entities/lab.entity';
import { Lab } from '../labs/entities/lab.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { LabsModule } from '../labs/labs.module';
import { ContentIndexerModule } from '../content-indexer/content-indexer.module';
import { CourseJsonImportService } from './course-json-import.service';
import { LabImportService } from './lab-import.service';
import { CertificationImportService } from './certification-import.service';
import { ContentImportService } from './content-import.service';
import { CertificationPathsImportService } from './certification-paths-import.service';
import { PracticeExamsModule } from '../practice-exams/practice-exams.module';
import { CertificationPath } from '../certifications/entities/certification-path.entity';
import { PracticeExam } from '../practice-exams/entities/practice-exam.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certification,
      Course,
      CourseModule,
      Lesson,
      LessonTranslation,
      CourseLab,
      Lab,
      CertificationPath,
      PracticeExam,
    ]),
    LabsModule,
    ContentIndexerModule,
    PracticeExamsModule,
  ],
  providers: [
    CertifCoursesImportService,
    CourseJsonImportService,
    LabImportService,
    CertificationImportService,
    CertificationPathsImportService,
    ContentImportService,
  ],
  exports: [
    ContentImportService,
    LabImportService,
    CertificationPathsImportService,
    CourseJsonImportService,
    CertificationImportService,
  ],
})
export class ContentImportModule {}
