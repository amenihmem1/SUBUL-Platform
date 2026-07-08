import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { QuizResultsService } from '../quiz-results/quiz-results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { DEFAULT_USER_ROLE, STATUS_ACTIVE, USER_ROLES } from '../common/constants';
import { AgentQuotaService } from '../platform/agent-quota.service';
import { UniversityService } from '../university/university.service';
import { CompaniesService } from '../companies/companies.service';
import { MailService } from '../mail/mail.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import * as crypto from 'crypto';

@ApiTags('Admin')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, SubscriptionGuard, AdminGuard)
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly quizResultsService: QuizResultsService,
    private readonly agentQuotaService: AgentQuotaService,
    private readonly universityService: UniversityService,
    private readonly companiesService: CompaniesService,
    private readonly mailService: MailService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (admin, learner, employer, instructor, student, university, commercial)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active, inactive, pending, suspended)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      role,
      status,
      search,
    });
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ schema: { type: 'object', properties: { fullName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(@Body() body: { fullName?: string; email: string; phone?: string; role?: string; password: string }) {
    const user = await this.usersService.createLocalUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: body.role || DEFAULT_USER_ROLE,
    });
    await this.usersService.setEmailVerifiedById(user.id, true);
    return this.usersService.findById(user.id);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) throw new (await import('@nestjs/common')).NotFoundException('User not found');
    const institutionalLearnerAccess = await this.subscriptionsService.hasActiveInstitutionalStudentSeat(id);
    return { ...user, institutionalLearnerAccess };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { fullName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fullName?: string; email?: string; phone?: string; role?: string },
  ) {
    return this.usersService.update(id, body as any);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateUserStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.usersService.update(id, { status: body.status } as any);
  }

  @Post('users/:id/approve')
  @ApiOperation({ summary: 'Approve user (set status to active)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User approved' })
  async approveUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.update(id, { status: STATUS_ACTIVE } as any);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
    return { deleted: true };
  }

  @Patch('users/:id/password')
  @ApiOperation({ summary: 'Set user password (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { password: { type: 'string' } }, required: ['password'] } })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setUserPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string },
  ) {
    await this.usersService.setPassword(id, body.password);
    return { updated: true };
  }

  @Post('users/:id/send-reset-password')
  @ApiOperation({ summary: 'Send password reset email to user (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendResetPasswordEmail(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new (await import('@nestjs/common')).NotFoundException('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.updateResetToken(user.email, resetToken, tokenExpires);

    try {
      await this.mailService.sendPasswordReset(user.email, resetToken);
    } catch (error) {
      await this.usersService.clearResetToken(user.email);
      const msg = error instanceof Error ? error.message : String(error);
      throw new (await import('@nestjs/common')).InternalServerErrorException(
        `Failed to send password reset email: ${msg}`,
      );
    }

    return { message: 'Password reset email sent successfully', email: user.email };
  }

  @Post('test-email')
  @ApiOperation({ summary: 'Send a diagnostic test email (admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email address' } }, required: ['to'] } })
  @ApiResponse({ status: 200, description: 'Test email result' })
  async sendTestEmail(@Body() body: { to: string }) {
    return this.mailService.sendTestDiagnostic(body.to);
  }

  @Get('progression')
  @ApiOperation({ summary: 'Get learners progression' })
  @ApiResponse({ status: 200, description: 'Progression data returned' })
  async getProgression() {
    return this.adminService.getLearnersProgression();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated system stats' })
  @ApiResponse({ status: 200, description: 'Stats returned' })
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Full platform overview for admin' })
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get('auth-stats')
  @ApiOperation({ summary: 'Auth & growth metrics (verification, subscriptions, signups, reset requests)' })
  @ApiResponse({ status: 200, description: 'Aggregated auth stats for dashboard charts' })
  async getAuthStats() {
    return this.adminService.getAuthStats();
  }

  @Get('employers')
  @ApiOperation({ summary: 'List recruiters (employers) with company and job counts' })
  async getEmployers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.universityService.adminListEmployers(+page, +limit);
  }

  @Post('employers')
  @ApiOperation({ summary: 'Create recruiter (employer) + company' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        fullName: { type: 'string' },
        companyName: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  async createEmployer(
    @Body() body: { email: string; password: string; fullName?: string; companyName?: string },
  ) {
    const user = await this.usersService.createLocalUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: USER_ROLES.EMPLOYER,
      companyName: body.companyName,
    });
    await this.usersService.setEmailVerifiedById(user.id, true);
    const company = await this.companiesService.create(
      {
        name: body.companyName || user.companyName || 'Company',
        email: user.email,
      } as any,
      user.id,
    );
    await this.usersService.update(user.id, { companyId: company.id } as any);
    return { user: { id: user.id, email: user.email, role: USER_ROLES.EMPLOYER }, company };
  }

  @Get('settings/agent-limits')
  @ApiOperation({ summary: 'Get default agent monthly limits' })
  async getAgentLimits() {
    return this.agentQuotaService.getLimitsFromDb();
  }

  @Patch('settings/agent-limits')
  @ApiOperation({ summary: 'Update agent monthly limits (default + perAgent map)' })
  async patchAgentLimits(@Body() body: { default: number; perAgent?: Record<string, number> }) {
    await this.agentQuotaService.setLimits({
      default: body.default,
      perAgent: body.perAgent || {},
    });
    return this.agentQuotaService.getLimitsFromDb();
  }

  @Get('agent-usage')
  @ApiOperation({ summary: 'Agent usage for month' })
  async getAgentUsage(
    @Query('userId') userId?: string,
    @Query('yearMonth') yearMonth?: string,
    @Query('agentKey') agentKey?: string,
  ) {
    return this.agentQuotaService.getUsage(userId ? +userId : undefined, yearMonth, agentKey);
  }

  @Post('agent-usage/reset')
  @ApiOperation({ summary: 'Reset usage counter for user/agent/month' })
  async resetAgentUsage(
    @Body() body: { userId: number; agentKey: string; yearMonth: string },
  ) {
    await this.agentQuotaService.resetUsage(body.userId, body.agentKey, body.yearMonth);
    return { reset: true };
  }

  @Patch('users/:id/agent-limit-override')
  @ApiOperation({ summary: 'Set per-user override for all agent monthly limits (null to clear)' })
  async setAgentLimitOverride(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { limit: number | null },
  ) {
    await this.usersService.update(id, { agentLimitOverride: body.limit ?? undefined } as any);
    return { updated: true };
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get analytics overview for admin dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics overview with activeUsers, coursesCompleted, revenue, completionRate' })
  async getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('quiz-results/assessments')
  @ApiOperation({ summary: 'List all assessment results (admin) with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of assessment results with user' })
  async getQuizResultsAssessments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quizResultsService.findAllAssessmentResultsForAdmin({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('quiz-results/quiz-levels')
  @ApiOperation({ summary: 'List all quiz de niveau results (admin) with pagination' })
  @ApiQuery({ name: 'domain', required: false, description: 'Filter by domain (devops, ai, cyber)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of quiz-level results with user' })
  async getQuizResultsQuizLevels(
    @Query('domain') domain?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quizResultsService.findAllQuizLevelResultsForAdmin(domain || undefined, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('feedback/stats')
  @ApiOperation({
    summary: 'Get feedback statistics',
    deprecated: true,
    description: 'Stub — feedback module not implemented. Returns zeros.',
  })
  @ApiResponse({ status: 200, description: 'Feedback stats (total, pending, avgRating, resolved)' })
  async getFeedbackStats() {
    return { total: 0, pending: 0, avgRating: 0, resolved: 0, _note: 'not_implemented' };
  }

  @Get('feedback')
  @ApiOperation({ summary: 'Get user feedback' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'List of feedback' })
  async getFeedback(@Query('status') status?: string, @Query('type') type?: string, @Query('search') search?: string) {
    return [];
  }

  @Get('feedback/:id')
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Feedback ID' })
  @ApiResponse({ status: 200, description: 'Feedback found' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async getFeedbackById(@Param('id', ParseIntPipe) id: number) {
    throw new (await import('@nestjs/common')).NotFoundException('Feedback not found');
  }

  @Patch('feedback/:id')
  @ApiOperation({ summary: 'Update feedback' })
  @ApiParam({ name: 'id', type: Number, description: 'Feedback ID' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' }, response: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Feedback updated' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async updateFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string; response?: string },
  ) {
    return { id, ...body, user: '', email: '', type: '', subject: '', message: '', rating: 0, createdAt: '' };
  }

  @Delete('feedback/:id')
  @ApiOperation({ summary: 'Delete feedback' })
  async deleteFeedback(@Param('id', ParseIntPipe) id: number) {
    return;
  }

}
