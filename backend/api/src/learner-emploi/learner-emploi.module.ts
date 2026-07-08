import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LearnerEmploiController } from './learner-emploi.controller';
import { LearnerEmploiService } from './learner-emploi.service';
import { ResumeParsingService } from './services/resume-parsing.service';
import { ResumeReviewService } from './services/resume-review.service';
import { JobAggregationService } from './services/job-aggregation.service';
import { AtsScoringService } from './services/ats-scoring.service';

@Module({
  imports: [AgentsModule, AuthModule, SubscriptionsModule],
  controllers: [LearnerEmploiController],
  providers: [
    LearnerEmploiService,
    ResumeParsingService,
    ResumeReviewService,
    JobAggregationService,
    AtsScoringService,
  ],
})
export class LearnerEmploiModule {}
