import { Controller, Get, Post, Req, Param, Query, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LearnerService } from './learner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Learner')
@ApiBearerAuth('access_token')
@Controller('api/learner')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class LearnerController {
  constructor(
    private readonly learnerService: LearnerService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('content-access')
  @ApiOperation({ summary: 'Get content access info (which items are locked/unlocked for this learner)' })
  @ApiResponse({ status: 200, description: 'Content access info returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getContentAccess(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getContentAccessInfo(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get learner dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getDashboardData(req.user.id);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get learner enrolled courses' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCourses(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getEnrolledCourses(req.user.id);
  }

  @Get('catalog/courses')
  @ApiOperation({
    summary: 'Get courses catalog for learner',
    description:
      'By default, only courses matching the learner profile (user track ∪ enrolled tracks ∪ latest assessment). Pass fullCatalog=true for all courses. Optional track narrows to one track.',
  })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCatalogCourses(
    @Req() req: Request & { user: { id: number } },
    @Query('track') track?: string,
    @Query('fullCatalog') fullCatalog?: string,
  ) {
    const full = fullCatalog === 'true' || fullCatalog === '1';
    return this.learnerService.getCatalogCoursesForUser(req.user.id, {
      fullCatalog: full,
      explicitTrack: track,
    });
  }

  @Get('certifications')
  @ApiOperation({
    summary: 'Get available certifications for learner',
    description:
      'By default, certifications whose domain or linked courses match the learner profile. Pass fullCatalog=true for the full list.',
  })
  @ApiResponse({ status: 200, description: 'Available certifications with courses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCertifications(
    @Req() req: Request & { user: { id: number } },
    @Query('track') track?: string,
    @Query('fullCatalog') fullCatalog?: string,
  ) {
    const full = fullCatalog === 'true' || fullCatalog === '1';
    return this.learnerService.getAvailableCertificationsForUser(req.user.id, {
      fullCatalog: full,
      explicitTrack: track,
    });
  }

  @Get('labs')
  @ApiOperation({
    summary: 'Get published labs scoped to learner profile',
    description:
      'By default, labs whose track matches user track ∪ enrolled course tracks ∪ latest assessment. Pass fullCatalog=true for all published labs.',
  })
  @ApiResponse({ status: 200, description: 'List of labs (same shape as GET /api/labs)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLabsForLearner(
    @Req() req: Request & { user: { id: number } },
    @Query('track') track?: string,
    @Query('fullCatalog') fullCatalog?: string,
  ) {
    const full = fullCatalog === 'true' || fullCatalog === '1';
    return this.learnerService.getLabsForLearner(req.user.id, {
      fullCatalog: full,
      explicitTrack: track,
    });
  }

  @Get('certifications/status')
  @ApiOperation({ summary: 'Get earned and in-progress certifications for the current learner' })
  @ApiResponse({ status: 200, description: 'Earned and in-progress certifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCertificationStatus(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getCertificationStatus(req.user.id);
  }

  @Get('certifications/:id/path')
  @ApiOperation({ summary: 'Get certification path progress for current learner' })
  @ApiParam({ name: 'id', type: Number, description: 'Certification ID' })
  async getCertificationPath(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.learnerService.getCertificationPath(req.user.id, id);
  }

  @Get('certifications/:id/experience')
  @ApiOperation({ summary: 'Get full learner certification experience payload' })
  @ApiParam({ name: 'id', type: Number, description: 'Certification ID' })
  async getCertificationExperience(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.learnerService.getCertificationExperience(req.user.id, id);
  }

  @Get('certifications/diagnostics')
  @ApiOperation({ summary: 'Get certification diagnostics for the current learner' })
  @ApiResponse({ status: 200, description: 'Certification diagnostics returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCertificationDiagnostics(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getCertificationDiagnostics(req.user.id);
  }

  @Get('certifications/issued')
  @ApiOperation({ summary: 'Get issued certificates for current learner' })
  @ApiResponse({ status: 200, description: 'Issued certificates returned' })
  async getIssuedCertificates(@Req() req: Request & { user: { id: number } }) {
    return this.learnerService.getIssuedCertificates(req.user.id);
  }

  @Get('certifications/issued/:id')
  @ApiOperation({ summary: 'Get one issued certificate for current learner' })
  @ApiParam({ name: 'id', type: Number, description: 'Issued certificate ID' })
  @ApiResponse({ status: 200, description: 'Issued certificate returned' })
  async getIssuedCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.learnerService.getIssuedCertificate(req.user.id, id);
  }

  @Get('certifications/issued/:id/download')
  @ApiOperation({ summary: 'Download one issued certificate as PDF for current learner' })
  @ApiParam({ name: 'id', type: Number, description: 'Issued certificate ID' })
  async downloadIssuedCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.learnerService.downloadIssuedCertificatePdf(req.user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(buffer);
  }

  @Get('certifications/:id/download')
  @ApiOperation({ summary: 'Download learner certificate as PDF by certification ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Certification ID' })
  async downloadCertificateByCertificationId(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.learnerService.downloadCertificatePdfByCertificationId(req.user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(buffer);
  }

  @Get('courses/:courseId/certificate/download')
  @ApiOperation({ summary: 'Download course completion certificate as PDF' })
  @ApiParam({ name: 'courseId', type: String, description: 'Course ID (VARCHAR)' })
  async downloadCourseCompletionCertificate(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: { id: number } },
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.learnerService.buildCourseCompletionCertificate(req.user.id, courseId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(buffer);
  }

  @Get('certifications/verify/:code')
  @ApiOperation({ summary: 'Verify issued certificate by verification code' })
  @ApiParam({ name: 'code', type: String, description: 'Verification code' })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  async verifyIssuedCertificate(@Param('code') code: string) {
    return this.learnerService.verifyIssuedCertificate(code);
  }

  @Post('certifications/:id/enroll')
  @ApiOperation({ summary: 'Enroll current user in a certification' })
  @ApiParam({ name: 'id', type: Number, description: 'Certification ID' })
  @ApiResponse({ status: 201, description: 'Enrollment successful.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Upgrade required for certifications.' })
  async enrollInCertification(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    const access = await this.subscriptionsService.resolveAccessProfile(req.user.id);
    if (!this.subscriptionsService.hasCertificationAccess(access)) {
      throw new ForbiddenException(
        'Certifications require the Premium offer (or an active institutional seat with Premium-equivalent access).',
      );
    }
    return this.learnerService.enrollInCertification(req.user.id, id);
  }
}
