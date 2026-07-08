import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizFeedback } from './quiz-feedback.entity';
import { QuizFeedbackController } from './quiz-feedback.controller';
import { QuizFeedbackService } from './quiz-feedback.service';
import { AdminQuizFeedbackController } from './admin-quiz-feedback.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuizFeedback])],
  controllers: [QuizFeedbackController, AdminQuizFeedbackController],
  providers: [QuizFeedbackService],
  exports: [QuizFeedbackService],
})
export class QuizFeedbackModule {}
