import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import {
  AssignContentDto,
  BulkAssignDto,
  LearnerAssignmentsService,
} from '../learner-assignments/learner-assignments.service';
import { User } from '../users/entities/user.entity';
import { UserCourseProgress } from '../courses/entities/user-course-progress.entity';
import { LabProgress } from '../labs/entities/lab-progress.entity';
import { IssuedCertificate } from '../certifications/entities/issued-certificate.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

type LearnerRole = 'learner' | 'student';

@UseGuards(JwtAuthGuard, SubscriptionGuard, AdminGuard)
@Controller('api/admin/learners')
export class AdminLearnersController {
  constructor(
    private readonly learnerAssignmentsService: LearnerAssignmentsService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserCourseProgress)
    private readonly courseProgressRepo: Repository<UserCourseProgress>,
    @InjectRepository(LabProgress)
    private readonly labProgressRepo: Repository<LabProgress>,
    @InjectRepository(IssuedCertificate)
    private readonly issuedCertRepo: Repository<IssuedCertificate>,
  ) {}

  @Get()
  async listLearners(
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '20',
    @Query('search') search?: string,
    @Query('track') track?: string,
    @Query('plan') plan?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(limitRaw, 10) || 20));
    const offset = (page - 1) * limit;

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.role)) IN (:...roles)', { roles: ['learner', 'student'] as LearnerRole[] });

    if (search?.trim()) {
      qb.andWhere('(LOWER(u.fullName) LIKE :search OR LOWER(u.email) LIKE :search)', {
        search: `%${search.trim().toLowerCase()}%`,
      });
    }
    if (track?.trim() && track !== 'all') {
      qb.andWhere('LOWER(COALESCE(u.track, \'\')) = :track', {
        track: track.trim().toLowerCase(),
      });
    }

    const [users, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const data = await Promise.all(
      users.map(async (user) => {
        const [access, inProgressCoursesCount, completedCoursesCount] = await Promise.all([
          this.subscriptionsService.resolveAccessProfile(user.id),
          this.courseProgressRepo.count({ where: { userId: user.id, status: 'in_progress' as any } }),
          this.courseProgressRepo.count({
            where: { userId: user.id, status: 'completed' as any },
          }),
        ]);
        return {
          id: user.id,
          fullName: user.fullName ?? user.email.split('@')[0],
          email: user.email,
          track: user.track ?? null,
          subscriptionStatus: access.kind,
          effectivePlanSlug: access.effectivePlanSlug,
          enrolledCoursesCount: inProgressCoursesCount + completedCoursesCount,
          completedCoursesCount,
          lastActiveAt: user.lastLogin ? user.lastLogin.toISOString() : null,
        };
      }),
    );

    const filteredData =
      plan && plan !== 'all'
        ? data.filter((row) => row.effectivePlanSlug === plan || row.subscriptionStatus === plan)
        : data;

    return {
      data: filteredData,
      total: plan && plan !== 'all' ? filteredData.length : total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil((plan && plan !== 'all' ? filteredData.length : total) / limit)),
    };
  }

  @Get(':userId')
  async getLearner(@Param('userId', ParseIntPipe) userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !this.isLearnerRole(user.role)) {
      throw new NotFoundException('Learner not found');
    }

    const [access, assignments, enrolledCourses, completedCourses, labsCompleted, certificates] =
      await Promise.all([
        this.subscriptionsService.resolveAccessProfile(userId),
        this.learnerAssignmentsService.getLearnerAssignments(userId),
        this.courseProgressRepo.count({
          where: [{ userId, status: 'in_progress' as any }, { userId, status: 'completed' as any }],
        }),
        this.courseProgressRepo.count({ where: { userId, status: 'completed' as any } }),
        this.labProgressRepo.count({ where: { userId, isCompleted: true } }),
        this.issuedCertRepo.count({ where: { userId } }),
      ]);

    return {
      id: user.id,
      fullName: user.fullName ?? user.email.split('@')[0],
      email: user.email,
      track: user.track ?? null,
      lastActiveAt: user.lastLogin ? user.lastLogin.toISOString() : null,
      subscription: {
        kind: access.kind,
        effectivePlanSlug: access.effectivePlanSlug,
        hasAccess: access.hasAccess,
      },
      stats: {
        enrolledCourses,
        completedCourses,
        labsCompleted,
        certificates,
      },
      assignments,
    };
  }

  @Get(':userId/assignments')
  async getAssignments(@Param('userId', ParseIntPipe) userId: number) {
    return this.learnerAssignmentsService.getLearnerAssignments(userId);
  }

  @Post(':userId/assign')
  async assignContent(
    @Req() req: { user: { id: number } },
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignContentDto,
  ) {
    return this.learnerAssignmentsService.assignContent(req.user.id, userId, dto);
  }

  @Delete(':userId/assign/:id')
  async removeAssignment(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const assignment = await this.learnerAssignmentsService.getLearnerAssignments(userId);
    const exists = assignment.some((a) => a.id === id);
    if (!exists) {
      return { removed: false };
    }
    await this.learnerAssignmentsService.removeAssignment(id);
    return { removed: true };
  }

  @Post('bulk-assign')
  async bulkAssign(@Req() req: { user: { id: number } }, @Body() dto: BulkAssignDto) {
    return this.learnerAssignmentsService.bulkAssign(req.user.id, dto);
  }

  private isLearnerRole(role?: string | null): role is LearnerRole {
    const normalized = (role ?? '').trim().toLowerCase();
    return normalized === 'learner' || normalized === 'student';
  }
}
