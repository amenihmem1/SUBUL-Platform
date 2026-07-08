import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearnerAssignmentsService } from './learner-assignments.service';
import { LearnerContentAssignment } from './entities/learner-content-assignment.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lab } from '../labs/entities/lab.entity';
import { Certification } from '../certifications/entities/certification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LearnerContentAssignment,
      User,
      Course,
      Lab,
      Certification,
    ]),
  ],
  providers: [LearnerAssignmentsService],
  exports: [LearnerAssignmentsService],
})
export class LearnerAssignmentsModule {}
