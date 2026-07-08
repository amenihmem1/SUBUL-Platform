import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoadmap } from './entities/roadmap.entity';
import { RoadmapService } from './roadmap.service';
import { RoadmapController } from './roadmap.controller';
import { AuthModule } from '../auth/auth.module';
import { QuizResultsModule } from '../quiz-results/quiz-results.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRoadmap]),
    AuthModule,
    QuizResultsModule,
    UsersModule,
  ],
  controllers: [RoadmapController],
  providers: [RoadmapService],
  exports: [RoadmapService],
})
export class RoadmapModule {}
