import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { EmployerService } from './employer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@ApiTags('Employer')
@ApiBearerAuth('access_token')
@Controller('api/employer')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get employer dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Req() req: Request & { user: { id: number } }) {
    return this.employerService.getDashboardData(req.user.id);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get jobs posted by employer with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', schema: { type: 'integer', default: 10 } })
  @ApiResponse({ status: 200, description: 'Paginated list of jobs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getJobs(
    @Req() req: Request & { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employerService.getEmployerJobs(
      req.user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
    );
  }

  @Get('candidates')
  @ApiOperation({ summary: 'Get candidates' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job id' })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCandidates(
    @Req() req: Request & { user: { id: number } },
    @Query('status') status?: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.employerService.getCandidates(req.user.id, status, jobId);
  }

  @Get('candidates/:id')
  @ApiOperation({ summary: 'Get candidate by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async getCandidate(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    const candidate = await this.employerService.getCandidate(req.user.id, id);
    if (!candidate) throw new (await import('@nestjs/common')).NotFoundException('Candidate not found');
    return candidate;
  }

  @Patch('candidates/:id/status')
  @ApiOperation({ summary: 'Update candidate status' })
  @ApiParam({ name: 'id', type: Number, description: 'Candidate ID' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', example: 'interviewed' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Candidate updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCandidateStatus(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.employerService.updateCandidateStatus(req.user.id, id, body.status);
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Get interviews' })
  @ApiResponse({ status: 200, description: 'List of interviews' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInterviews(@Req() req: Request & { user: { id: number } }) {
    return this.employerService.getInterviews(req.user.id);
  }

  @Post('interviews')
  @ApiOperation({ summary: 'Create interview' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Interview title' },
        candidateId: { type: 'number', description: 'Candidate ID' },
        jobId: { type: 'number', description: 'Job ID' },
        description: { type: 'string', description: 'Interview description' },
        scheduledAt: { type: 'string', format: 'date-time', description: 'Interview date' },
        durationMinutes: { type: 'number', description: 'Duration in minutes' },
        meetingUrl: { type: 'string', description: 'Meeting URL' },
        meetingType: { type: 'string', description: 'Meeting type (video, phone, in-person)' },
        location: { type: 'string', description: 'Location' },
      },
      required: ['title', 'scheduledAt'],
    },
  })
  @ApiResponse({ status: 201, description: 'Interview created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createInterview(@Req() req: Request & { user: { id: number } }, @Body() data: {
    title: string;
    candidateId?: number;
    jobId?: number;
    description?: string;
    scheduledAt: string;
    durationMinutes?: number;
    meetingUrl?: string;
    meetingType?: string;
    location?: string;
  }) {
    return this.employerService.createInterview(req.user.id, {
      title: data.title,
      candidateId: data.candidateId,
      jobId: data.jobId,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      meetingUrl: data.meetingUrl,
      meetingType: data.meetingType,
      location: data.location,
    });
  }

  @Patch('interviews/:id')
  @ApiOperation({ summary: 'Update interview' })
  @ApiParam({ name: 'id', type: Number, description: 'Interview ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time' },
        status: { type: 'string', example: 'completed' },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Interview updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateInterview(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.employerService.updateInterview(req.user.id, id, data);
  }

  @Delete('interviews/:id')
  @ApiOperation({ summary: 'Delete interview' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Interview deleted' })
  async deleteInterview(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    await this.employerService.deleteInterview(req.user.id, id);
  }

  @Get('company')
  @ApiOperation({ summary: 'Get employer company' })
  @ApiResponse({ status: 200, description: 'Company data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompany(@Req() req: Request & { user: { id: number } }) {
    return this.employerService.getCompany(req.user.id);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Update employer company' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Corp' },
        sector: { type: 'string', example: 'Technology' },
        logo: { type: 'string', example: 'https://example.com/logo.png' },
        email: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCompany(@Req() req: Request & { user: { id: number } }, @Body() data: Record<string, unknown>) {
    return this.employerService.updateCompany(req.user.id, data);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get employees with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', schema: { type: 'integer', default: 10 } })
  @ApiResponse({ status: 200, description: 'Paginated list of employees' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEmployees(
    @Req() req: Request & { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.employerService.getEmployees(
      req.user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
    );
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create employee' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@company.com' },
        position: { type: 'string', example: 'Software Engineer' },
        department: { type: 'string', example: 'Engineering' },
      },
      required: ['name', 'email'],
    },
  })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createEmployee(
    @Req() req: Request & { user: { id: number } },
    @Body() data: { name: string; email: string; position?: string; department?: string },
  ) {
    return this.employerService.createEmployee(req.user.id, data);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployee(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.employerService.getEmployee(req.user.id, id);
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        position: { type: 'string' },
        department: { type: 'string' },
        learnerStatus: { type: 'string' },
        coursesInProgress: { type: 'integer' },
        coursesCompleted: { type: 'integer' },
        certifications: { type: 'integer' },
        progression: { type: 'integer' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Employee updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateEmployee(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.employerService.updateEmployee(req.user.id, id, data);
  }

  @Delete('employees/:id')
  @ApiOperation({ summary: 'Delete employee' })
  @ApiParam({ name: 'id', type: Number, description: 'Employee ID' })
  @ApiResponse({ status: 200, description: 'Employee deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteEmployee(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.employerService.deleteEmployee(req.user.id, id);
  }

  @Get('certified-learners')
  @ApiOperation({ summary: 'Get certified learners with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', schema: { type: 'integer', default: 10 } })
  @ApiQuery({ name: 'domain', required: false, description: 'Filter by domain' })
  @ApiQuery({ name: 'level', required: false, description: 'Filter by level' })
  @ApiResponse({ status: 200, description: 'Paginated list of certified learners' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCertifiedLearners(
    @Req() req: Request & { user: { id: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('domain') domain?: string,
    @Query('level') level?: string,
  ) {
    return this.employerService.getCertifiedLearners(
      req.user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
      domain,
      level,
    );
  }

  @Post('certified-learners')
  @ApiOperation({ summary: 'Create certified learner' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Smith' },
        email: { type: 'string', example: 'jane@email.com' },
        certification: { type: 'string', example: 'AWS Solutions Architect' },
        domain: { type: 'string', example: 'Cloud Computing' },
        score: { type: 'integer', example: 95 },
        level: { type: 'string', example: 'expert' },
        available: { type: 'boolean', example: true },
      },
      required: ['name', 'email', 'certification'],
    },
  })
  @ApiResponse({ status: 201, description: 'Certified learner created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCertifiedLearner(
    @Req() req: Request & { user: { id: number } },
    @Body() data: {
      name: string;
      email: string;
      certification: string;
      domain?: string;
      score?: number;
      level?: string;
      available?: boolean;
    },
  ) {
    return this.employerService.createCertifiedLearner(req.user.id, data);
  }

  @Get('certified-learners/:id')
  @ApiOperation({ summary: 'Get certified learner by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Learner ID' })
  @ApiResponse({ status: 200, description: 'Learner found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Learner not found' })
  async getCertifiedLearner(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.employerService.getCertifiedLearner(req.user.id, id);
  }

  @Patch('certified-learners/:id')
  @ApiOperation({ summary: 'Update certified learner' })
  @ApiParam({ name: 'id', type: Number, description: 'Learner ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        certification: { type: 'string' },
        domain: { type: 'string' },
        score: { type: 'integer' },
        level: { type: 'string' },
        available: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Learner updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCertifiedLearner(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    return this.employerService.updateCertifiedLearner(req.user.id, id, data);
  }

  @Delete('certified-learners/:id')
  @ApiOperation({ summary: 'Delete certified learner' })
  @ApiParam({ name: 'id', type: Number, description: 'Learner ID' })
  @ApiResponse({ status: 200, description: 'Learner deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteCertifiedLearner(@Req() req: Request & { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.employerService.deleteCertifiedLearner(req.user.id, id);
  }
}
