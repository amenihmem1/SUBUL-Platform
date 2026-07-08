import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { QuizResultsModule } from '../quiz-results/quiz-results.module';
import { LabsModule } from '../labs/labs.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { JobsModule } from '../jobs/jobs.module';
import { PlatformModule } from '../platform/platform.module';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { UserAgentState } from './entities/user-agent-state.entity';
import { JobSearchChatMessage } from './entities/job-search-chat-message.entity';
import { JobSearchChatService } from './job-search-chat.service';
import { UserCv } from '../user-cv/entities/user-cv.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserAgentState, JobSearchChatMessage, UserCv]),
    AuthModule,
    QuizResultsModule,
    LabsModule,
    CertificationsModule,
    JobsModule,
    PlatformModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, JobSearchChatService],
  exports: [AgentsService, JobSearchChatService],
})
export class AgentsModule {}
