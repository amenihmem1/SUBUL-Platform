import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Jobs')
@Controller('api')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ==========================================
  // EMPLOYER ENDPOINTS
  // ==========================================

  @Post('jobs')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new job offer (Employer)' })
  @ApiResponse({ status: 201, description: 'Job created and pending validation.' })
  async create(@Body() createJobDto: CreateJobDto, @Req() req: any) {
    const employerId = req.user.id;
    const companyId = req.user.companyId;
    const job = await this.jobsService.create(createJobDto, employerId, companyId);
    return { job, message: 'Offre soumise et en attente de validation' };
  }

  @Patch('jobs/:id')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit a job offer (Employer)' })
  @ApiResponse({ status: 200, description: 'Job updated and resubmitted for validation.' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateJobDto: UpdateJobDto, @Req() req: any) {
    const employerId = req.user.id;
    const companyId = req.user.companyId;
    const job = await this.jobsService.update(id, updateJobDto, employerId, companyId);
    return { job, message: job.status === 'pending' ? 'Offre modifiée, en attente de re-validation' : 'Offre mise à jour' };
  }

  @Delete('jobs/:id')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a job offer (Employer)' })
  @ApiResponse({ status: 200, description: 'Job soft deleted.' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const employerId = req.user.id;
    const companyId = req.user.companyId;
    await this.jobsService.remove(id, employerId, companyId);
    return { message: 'Offre supprimée' };
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  @Get('jobs')
  @ApiOperation({ summary: 'List all published jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns published jobs.' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.jobsService.findAll('published', +page, +limit);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Returns a specific job.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id);
  }


  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  @Get('admin/jobs')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'List pending jobs (Admin)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (default: pending)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  findAllAdmin(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    if (status === 'pending') {
      return this.jobsService.findAllPendingForAdmin(+page, +limit);
    }
    if (status === 'all' || status === '' || status === undefined) {
      return this.jobsService.findAllForAdmin(+page, +limit);
    }
    return this.jobsService.findAll(status, +page, +limit);
  }

  @Get('admin/jobs/:id')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get complete job details (Admin)' })
  @ApiResponse({ status: 200, description: 'Complete job info.' })
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch('admin/jobs/:id/status')
  @ApiBearerAuth('access_token')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Accept or Reject a job (Admin)' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['published', 'rejected'] }, adminNotes: { type: 'string' }, rejectionReason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Job status updated and employer notified.' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; adminNotes?: string; rejectionReason?: string },
    @Req() req: any
  ) {
    const adminId = req.user.id;
    const job = await this.jobsService.updateStatusForAdmin(
      id,
      body.status,
      adminId,
      body.adminNotes,
      body.rejectionReason
    );
    const message = job.status === 'published' ? 'Offre publiée' : 'Offre refusée';
    return { job, message };
  }
}
