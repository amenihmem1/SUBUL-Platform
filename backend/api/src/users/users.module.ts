import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { UserRoadmap } from '../roadmap/entities/roadmap.entity';
import { QuizLevelResult } from '../quiz-results/entities/quiz-level-result.entity';
import { AssessmentResult } from '../quiz-results/entities/assessment-result.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, UserRoadmap, QuizLevelResult, AssessmentResult]),
    forwardRef(() => AuthModule),
    SubscriptionsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
