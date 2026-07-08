import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { DailyGoalsService } from './daily-goals.service';
import { WeeklyGoalsService } from './weekly-goals.service';
import { GoalsController } from './goals.controller';
import { Goal } from './entities/goal.entity';
import { DailyGoal } from './entities/daily-goal.entity';
import { WeeklyGoal } from './entities/weekly-goal.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal, DailyGoal, WeeklyGoal, User]),
    AuthModule,
  ],
  controllers: [GoalsController],
  providers: [GoalsService, DailyGoalsService, WeeklyGoalsService],
  exports: [GoalsService, DailyGoalsService, WeeklyGoalsService],
})
export class GoalsModule {}
