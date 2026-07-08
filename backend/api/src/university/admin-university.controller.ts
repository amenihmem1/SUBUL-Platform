import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, ParseUUIDPipe, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UniversityService } from './university.service';
import { UniversityMembersService } from './university-members.service';
import { UniversityLicensesService } from './university-licenses.service';
import { UniversityAuditService } from './university-audit.service';
import { UniversityInvitesService } from './university-invites.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { USER_ROLES } from '../common/constants';
import { MailService } from '../mail/mail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from './entities/university.entity';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@ApiTags('Admin — Universities')
@ApiBearerAuth('access_token')
@Controller('api/admin/universities')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUniversityController {
  private readonly frontendUrl: string;

  constructor(
    private readonly universityService: UniversityService,
    private readonly usersService: UsersService,
    private readonly members: UniversityMembersService,
    private readonly licenses: UniversityLicensesService,
    private readonly audit: UniversityAuditService,
    private readonly invites: UniversityInvitesService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @InjectRepository(University)
    private readonly uniRepo: Repository<University>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
  }

  @Get()
  @ApiOperation({ summary: 'List all universities' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.universityService.adminList({
      status, search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('expiring-soon')
  @ApiOperation({ summary: 'Universities with licenses expiring within 30 days' })
  async expiringSoon() {
    return this.universityService.getExpiringSoon(30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get university detail' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.universityService.getUniversityDetail(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create university + send setup email' })
  async create(
    @Body() body: {
      name: string;
      billingEmail?: string;
      contactEmail: string;
      contactName?: string;
      country?: string;
      website?: string;
    },
    @Req() req: Request & { user: User },
  ) {
    return this.universityService.createWithSetup(body, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update university (profile, status)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      name?: string;
      status?: string;
      logo?: string;
      website?: string;
      country?: string;
      phone?: string;
      address?: string;
      billingEmail?: string;
      contractStartDate?: string;
      contractEndDate?: string;
      suspendReason?: string;
    },
    @Req() req: Request & { user: User },
  ) {
    return this.universityService.adminUpdate(id, body, req.user.id);
  }

  @Post(':id/resend-setup')
  @ApiOperation({ summary: 'Re-send university setup/activation email' })
  @HttpCode(HttpStatus.OK)
  async resendSetup(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.universityService.resendSetupEmail(id, req.user.id);
  }

  @Post(':id/set-temp-password')
  @ApiOperation({ summary: 'Manually set a temporary password for university admin (fallback)' })
  @HttpCode(HttpStatus.OK)
  async setTempPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { temporaryPassword: string },
    @Req() req: Request & { user: User },
  ) {
    return this.universityService.setTempPassword(id, body.temporaryPassword, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List all members of a university' })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.members.list(id, {
      role, status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add admin/coordinator to university' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { userId: number; role: 'admin' | 'coordinator'; cohortId?: string; departmentId?: string },
    @Req() req: Request & { user: User },
  ) {
    return this.members.createMembership(id, {
      userId: body.userId,
      role: body.role,
      cohortId: body.cohortId,
      departmentId: body.departmentId,
      actorUserId: req.user.id,
    });
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a university' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: Request & { user: User },
  ) {
    const membershipId = await this.members.findMembershipIdByUserId(id, userId);
    if (!membershipId) return { removed: false };
    return this.members.updateStatus(id, membershipId, 'removed', req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete university' })
  async deleteUniversity(@Param('id', ParseUUIDPipe) id: string) {
    await this.universityService.deleteUniversity(id);
    return { deleted: true };
  }

  @Post(':id/programs')
  @ApiOperation({ summary: 'Create program (admin)' })
  async createProgram(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title: string; description?: string; certificationId?: number },
  ) {
    return this.universityService.createProgram(id, body);
  }

  @Post(':id/staff')
  @ApiOperation({ summary: 'Create university dashboard staff user (password login)' })
  async createStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string; password: string; fullName?: string },
  ) {
    await this.universityService.getUniversity(id);
    const u = await this.usersService.createLocalUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: USER_ROLES.UNIVERSITY,
      universityId: id,
    });
    await this.usersService.setEmailVerifiedById(u.id, true);
    return { id: u.id, email: u.email, role: USER_ROLES.UNIVERSITY, universityId: id };
  }

  @Get(':id/licenses')
  @ApiOperation({ summary: 'List licenses for a university' })
  async listLicenses(@Param('id', ParseUUIDPipe) id: string) {
    return this.licenses.list(id);
  }

  @Post(':id/licenses')
  @ApiOperation({ summary: 'Assign new license to a university' })
  async assignLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      planId: string; seatsTotal: number;
      validFrom?: string; validUntil?: string;
      priceCents?: number; currency?: string; notes?: string;
    },
    @Req() req: Request & { user: User },
  ) {
    return this.licenses.assign(id, {
      planId: body.planId,
      seatsTotal: body.seatsTotal,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      priceCents: body.priceCents,
      currency: body.currency,
      notes: body.notes,
      actorUserId: req.user.id,
    });
  }

  @Patch(':id/licenses/:licId')
  @ApiOperation({ summary: 'Update license seats/validity/status' })
  async updateLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('licId', ParseUUIDPipe) licId: string,
    @Body() body: { seatsTotal?: number; validUntil?: string; status?: string; notes?: string },
    @Req() req: Request & { user: User },
  ) {
    return this.licenses.update(id, licId, {
      seatsTotal: body.seatsTotal,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      status: body.status as any,
      notes: body.notes,
      actorUserId: req.user.id,
    });
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'University usage analytics' })
  async analytics(@Param('id', ParseUUIDPipe) id: string) {
    return this.universityService.getAnalytics(id);
  }

  @Get(':id/audit-log')
  @ApiOperation({ summary: 'University audit log' })
  async auditLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = '50',
  ) {
    return this.audit.list(id, parseInt(limit, 10));
  }
}
