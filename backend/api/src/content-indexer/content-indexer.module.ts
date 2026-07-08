import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentIndexerService } from './content-indexer.service';
import { EmbeddingsService } from './embeddings.service';
import { IndexSchemaService } from './index-schema.service';
import { Course } from '../courses/entities/course.entity';
import { CourseModule as CourseModuleEntity } from '../courses/entities/course-module.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Lab } from '../labs/entities/lab.entity';
import { Certification } from '../certifications/entities/certification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModuleEntity,
      Lesson,
      Lab,
      Certification,
    ]),
  ],
  providers: [ContentIndexerService, EmbeddingsService, IndexSchemaService],
  exports: [ContentIndexerService],
})
export class ContentIndexerModule {}
