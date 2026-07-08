import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { UserExamStreak } from './entities/user-exam-streak.entity';
import { ExamQuestion } from './entities/exam-question.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamAttempt, UserExamStreak, ExamQuestion]), AuthModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
