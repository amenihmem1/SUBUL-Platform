import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  Param,
  ParseUUIDPipe,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UniversityStaffGuard } from './university-staff.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { UniversityService } from './university.service';
import { UniversityMembersService } from './university-members.service';
import { UniversityInvitesService } from './university-invites.service';
import { UniversityCohortsService } from './university-cohorts.service';
import { UniversityDepartmentsService } from './university-departments.service';
import { UniversityAuditService } from './university-audit.service';
import { User } from '../users/entities/user.entity';

@ApiTags('University')
@ApiBearerAuth('access_token')
@Controller('api/university')
@UseGuards(JwtAuthGuard)
export class UniversityController {
  constructor(
    private readonly universityService: UniversityService,
    private readonly members: UniversityMembersService,
    private readonly invites: UniversityInvitesService,
    private readonly cohorts: UniversityCohortsService,
    private readonly departments: UniversityDepartmentsService,
    private readonly audit: UniversityAuditService,
  ) {}

  private uid(req: Request & { user: User }) {
    return req.user.universityId!;
  }

  /* ── Student-facing: own institution info ── */
  @Get('my-institution')
  @ApiOperation({ summary: 'Student: get own university info (logo, name, cohort)' })
  async myInstitution(@Req() req: Request & { user: User }) {
    const userId = req.user.id ?? (req.user as any).sub;
    const universityId = req.user.universityId;
    if (!universityId) return null;
    return this.universityService.getMyInstitution(userId, universityId);
  }

  @Get('dashboard')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'University dashboard stats' })
  async dashboard(@Req() req: Request & { user: User }) {
    return this.universityService.getDashboardForStaff(this.uid(req));
  }

  @Get('programs')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'List programs' })
  async programs(@Req() req: Request & { user: User }) {
    return this.universityService.listPrograms(this.uid(req));
  }

  @Post('programs')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'Create program' })
  async createProgram(
    @Req() req: Request & { user: User },
    @Body() body: { title: string; description?: string; certificationId?: number },
  ) {
    return this.universityService.createProgram(this.uid(req), body);
  }

  @Patch('programs/:programId')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'Update program' })
  async updateProgram(
    @Req() req: Request & { user: User },
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() body: { title?: string; description?: string; active?: boolean; certificationId?: number },
  ) {
    return this.universityService.updateProgram(this.uid(req), programId, body);
  }

  @Delete('programs/:programId')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'Delete program' })
  async deleteProgram(
    @Req() req: Request & { user: User },
    @Param('programId', ParseUUIDPipe) programId: string,
  ) {
    return this.universityService.deleteProgram(this.uid(req), programId);
  }

  @Post('programs/import-students')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'CSV import scaffold (no-op until parser is wired)' })
  async importStudentsStub() {
    return {
      accepted: 0,
      skipped: 0,
      message: 'CSV import is not enabled yet. Use invites or bulk invite with parsed rows.',
    };
  }

  @Get('licenses')
  @UseGuards(UniversityStaffGuard)
  @ApiOperation({ summary: 'List licenses / seat packs' })
  async licenses(@Req() req: Request & { user: User }) {
    return this.universityService.listLicenses(this.uid(req));
  }

  @Post('invites')
  @ApiOperation({ summary: 'Send a single invite by email' })
  async sendInvite(
    @Req() req: Request & { user: User },
    @Body() body: { email: string; role?: string; cohortId?: string; departmentId?: string },
  ) {
    return this.invites.sendInvite(this.uid(req), {
      email: body.email,
      role: body.role as any,
      cohortId: body.cohortId,
      departmentId: body.departmentId,
      invitedBy: req.user.id,
    });
  }

  @Post('invites/bulk')
  @ApiOperation({ summary: 'Bulk invite students via CSV rows' })
  async bulkInvite(
    @Req() req: Request & { user: User },
    @Body() body: { rows: Array<{ email: string; fullName?: string; department?: string; cohort?: string }> },
  ) {
    return this.invites.bulkInvite(this.uid(req), body.rows || [], req.user.id);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List invites' })
  @ApiQuery({ name: 'status', required: false })
  async listInvites(
    @Req() req: Request & { user: User },
    @Query('status') status?: string,
  ) {
    return this.invites.list(this.uid(req), status);
  }

  @Post('invites/:id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invite' })
  async resendInvite(@Req() req: Request & { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.invites.resend(this.uid(req), id, req.user.id);
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Cancel an invite' })
  async cancelInvite(@Req() req: Request & { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.invites.cancel(this.uid(req), id, req.user.id);
  }

  @Get('programs/:programId/enrollments')
  @ApiOperation({ summary: 'Enrollments for a program' })
  async enrollments(@Req() req: Request & { user: User }, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.universityService.listEnrollmentsForProgram(this.uid(req), programId);
  }

  @Get('students')
  @ApiOperation({ summary: 'List students enrolled in university programs' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 10 } })
  @ApiQuery({ name: 'programId', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'status', required: false, schema: { type: 'string' } })
  @ApiQuery({ name: 'search', required: false, schema: { type: 'string' } })
  async listStudents(
    @Req() req: Request & { user: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('programId') programId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.universityService.listStudents(this.uid(req), {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '10', 10),
      programId,
      status,
      search,
    });
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'Get student details' })
  async getStudent(@Req() req: Request & { user: User }, @Param('id', ParseIntPipe) id: number) {
    return this.universityService.getStudent(this.uid(req), id);
  }

  @Patch('students/:id')
  @ApiOperation({ summary: 'Update student enrollment status' })
  async updateStudent(
    @Req() req: Request & { user: User },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { enrollmentStatus?: string; programId?: string },
  ) {
    return this.universityService.updateStudent(this.uid(req), id, body);
  }

  @Delete('students/:id')
  @ApiOperation({ summary: 'Remove student from program' })
  async removeStudent(
    @Req() req: Request & { user: User },
    @Param('id', ParseIntPipe) id: number,
    @Query('programId') programId?: string,
  ) {
    return this.universityService.removeStudent(this.uid(req), id, programId);
  }

  /* ── Memberships ── */

  @Get('memberships')
  @ApiOperation({ summary: 'List memberships' })
  async listMemberships(
    @Req() req: Request & { user: User },
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.members.list(this.uid(req), {
      role, status, search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch('memberships/:id')
  @ApiOperation({ summary: 'Update membership status (active/inactive/removed)' })
  async updateMembership(
    @Req() req: Request & { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'active' | 'inactive' | 'removed'; cohortId?: string; departmentId?: string },
  ) {
    if (body.cohortId !== undefined) {
      await this.members.assignCohort(this.uid(req), id, body.cohortId || null);
    }
    if (body.departmentId !== undefined) {
      await this.members.assignDepartment(this.uid(req), id, body.departmentId || null);
    }
    if (body.status) {
      return this.members.updateStatus(this.uid(req), id, body.status, req.user.id);
    }
    return { updated: true };
  }

  /* ── Cohorts ── */

  @Get('cohorts')
  @ApiOperation({ summary: 'List cohorts' })
  async listCohorts(@Req() req: Request & { user: User }) {
    return this.cohorts.list(this.uid(req));
  }

  @Post('cohorts')
  @ApiOperation({ summary: 'Create cohort' })
  async createCohort(
    @Req() req: Request & { user: User },
    @Body() body: { name: string; description?: string; departmentId?: string; startDate?: string; endDate?: string; planSlug?: string },
  ) {
    return this.cohorts.create(this.uid(req), body);
  }

  @Patch('cohorts/:id')
  @ApiOperation({ summary: 'Update cohort' })
  async updateCohort(
    @Req() req: Request & { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; description?: string; departmentId?: string; startDate?: string; endDate?: string; isActive?: boolean },
  ) {
    return this.cohorts.update(this.uid(req), id, body);
  }

  @Delete('cohorts/:id')
  @ApiOperation({ summary: 'Delete cohort' })
  async deleteCohort(@Req() req: Request & { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.cohorts.remove(this.uid(req), id);
  }

  /* ── Departments ── */

  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  async listDepartments(@Req() req: Request & { user: User }) {
    return this.departments.list(this.uid(req));
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(
    @Req() req: Request & { user: User },
    @Body() body: { name: string; description?: string },
  ) {
    return this.departments.create(this.uid(req), body);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(
    @Req() req: Request & { user: User },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.departments.update(this.uid(req), id, body);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department' })
  async deleteDepartment(@Req() req: Request & { user: User }, @Param('id', ParseUUIDPipe) id: string) {
    return this.departments.remove(this.uid(req), id);
  }

  /* ── Audit Log ── */

  @Get('audit-log')
  @ApiOperation({ summary: 'University audit log' })
  async auditLog(@Req() req: Request & { user: User }, @Query('limit') limit = '50') {
    return this.audit.list(this.uid(req), parseInt(limit, 10));
  }

  /* ── University profile (self-update) ── */

  @Patch('me')
  @ApiOperation({ summary: 'Update university profile (logo, website, etc.)' })
  async updateProfile(
    @Req() req: Request & { user: User },
    @Body() body: { logo?: string; website?: string; phone?: string; address?: string; billingEmail?: string },
  ) {
    return this.universityService.updateUniversity(this.uid(req), body);
  }
}
