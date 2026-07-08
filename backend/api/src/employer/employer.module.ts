import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployerController } from './employer.controller';
import { EmployerService } from './employer.service';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { EmployerCandidate, EmployerInterview, EmployerEmployee, EmployerCertifiedLearner } from './entities/employer.entity';

@Module({
  imports: [
    AuthModule,
    SubscriptionsModule,
    JobsModule, 
    UsersModule, 
    CompaniesModule,
    TypeOrmModule.forFeature([EmployerCandidate, EmployerInterview, EmployerEmployee, EmployerCertifiedLearner]),
  ],
  controllers: [EmployerController],
  providers: [EmployerService],
  exports: [EmployerService],
})
export class EmployerModule {}
