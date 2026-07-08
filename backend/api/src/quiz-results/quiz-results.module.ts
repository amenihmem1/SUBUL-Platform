import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizResultsService } from './quiz-results.service';
import { QuizResultsController } from './quiz-results.controller';
import { AssessmentResult } from './entities/assessment-result.entity';
import { QuizLevelResult } from './entities/quiz-level-result.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentResult, QuizLevelResult]), AuthModule],
  controllers: [QuizResultsController],
  providers: [QuizResultsService],
  exports: [QuizResultsService],
})
export class QuizResultsModule {}
