import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { University } from './entities/university.entity';
import { UniversityProgram } from './entities/university-program.entity';
import { UniversityLicense } from './entities/university-license.entity';
import { UniversityProgramEnrollment } from './entities/university-program-enrollment.entity';
import { UniversityInvite } from './entities/university-invite.entity';
import { UniversityMembership } from './entities/university-membership.entity';
import { UniversityDepartment } from './entities/university-department.entity';
import { UniversityCohort } from './entities/university-cohort.entity';
import { UniversityAuditLog } from './entities/university-audit-log.entity';
import { User } from '../users/entities/user.entity';
import { UniversityService } from './university.service';
import { UniversityController } from './university.controller';
import { AdminUniversityController } from './admin-university.controller';
import { UniversityStaffGuard } from './university-staff.guard';
import { UniversityMembersService } from './university-members.service';
import { UniversityInvitesService } from './university-invites.service';
import { UniversityCohortsService } from './university-cohorts.service';
import { UniversityDepartmentsService } from './university-departments.service';
import { UniversityLicensesService } from './university-licenses.service';
import { UniversityAuditService } from './university-audit.service';
import { UniversityMemberGuard } from './university-member.guard';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MailModule } from '../mail/mail.module';
import { UniversityAuthController } from './university-auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      University,
      UniversityProgram,
      UniversityLicense,
      UniversityProgramEnrollment,
      UniversityInvite,
      UniversityMembership,
      UniversityDepartment,
      UniversityCohort,
      UniversityAuditLog,
      User,
    ]),
    AuthModule,
    SubscriptionsModule,
    MailModule,
    UsersModule,
  ],
  controllers: [UniversityController, AdminUniversityController, UniversityAuthController],
  providers: [
    UniversityService,
    UniversityStaffGuard,
    UniversityMembersService,
    UniversityInvitesService,
    UniversityCohortsService,
    UniversityDepartmentsService,
    UniversityLicensesService,
    UniversityAuditService,
    UniversityMemberGuard,
  ],
  exports: [
    UniversityService,
    UniversityMembersService,
    UniversityInvitesService,
    UniversityLicensesService,
    UniversityMemberGuard,
    TypeOrmModule,
  ],
})
export class UniversityModule {}
