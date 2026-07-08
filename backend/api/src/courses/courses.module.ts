import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { CourseModule as CourseModuleEntity } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonTranslation } from './entities/lesson-translation.entity';
import { Lab } from './entities/lab.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { LabsModule } from '../labs/labs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseModuleEntity, Lesson, LessonTranslation, Lab, UserCourseProgress]),
    AuthModule,
    SubscriptionsModule,
    forwardRef(() => UsersModule),
    forwardRef(() => CertificationsModule),
    LabsModule,
    TranslationModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
