import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationModule } from '../translation/translation.module';
import { PracticeExam } from './entities/practice-exam.entity';
import { PracticeExamQuestion } from './entities/practice-exam-question.entity';
import { PracticeExamsService } from './practice-exams.service';
import { PracticeExamAttempt } from './entities/practice-exam-attempt.entity';
import { PracticeExamsController } from './practice-exams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PracticeExam, PracticeExamQuestion, PracticeExamAttempt]), TranslationModule],
  controllers: [PracticeExamsController],
  providers: [PracticeExamsService],
  exports: [PracticeExamsService, TypeOrmModule],
})
export class PracticeExamsModule {}
