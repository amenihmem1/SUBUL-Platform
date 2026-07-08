import {
  Controller, Get, Post, Param, Query, Req, Body, UseGuards, NotFoundException, InternalServerErrorException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CertificationsService } from '../certifications/certifications.service';

@ApiTags('Courses')
@Controller('api/courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly certificationsService: CertificationsService,
  ) {}

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtenir les cours de l\'utilisateur connecté',
    description: 'Retourne les cours en cours et complétés de l\'utilisateur (UserCourseProgress).',
  })
  @ApiResponse({ status: 200, description: 'Liste des cours inscrits retournée.' })
  @ApiResponse({ status: 500, description: 'Erreur serveur.' })
  async getEnrolledCourses(@Req() req: Request & { user: { id: number } }) {
    try {
      return await this.coursesService.getEnrolledCourses(req.user.id);
    } catch (err: unknown) {
      throw new InternalServerErrorException('Failed to fetch enrolled courses');
    }
  }

  @Get(':courseId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user progress for a course',
    description: 'Returns completedLessons, completedLabs, overallProgress, status. Null if not enrolled.',
  })
  @ApiParam({ name: 'courseId', type: String, example: 'AZ-900-UNIFIED' })
  @ApiResponse({ status: 200, description: 'Progress object or null.' })
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.coursesService.getProgressByCourseId(courseId, req.user.id);
  }

  @Post(':courseId/complete-lesson')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mark a lesson as complete',
    description: 'Updates user progress; creates progress record if user not yet enrolled.',
  })
  @ApiParam({ name: 'courseId', type: String, example: 'AZ-900-UNIFIED' })
  @ApiBody({ type: CompleteLessonDto })
  @ApiResponse({ status: 200, description: 'Updated progress.' })
  @ApiResponse({ status: 404, description: 'Course or module/lesson not found.' })
  async completeLesson(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: { id: number } },
    @Body() dto: CompleteLessonDto,
  ) {
    try {
      return await this.coursesService.completeLesson(courseId, req.user.id, dto);
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to complete lesson');
    }
  }

  @Post(':courseId/complete-lab')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mark a lab as complete',
    description: 'Updates user progress. labId is the numeric id from course content (per-level lab index).',
  })
  @ApiParam({ name: 'courseId', type: String, example: 'AZ-900-UNIFIED' })
  @ApiResponse({ status: 200, description: 'Updated progress.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  async completeLab(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: { id: number } },
    @Body('labId') labId: number,
  ) {
    if (labId == null || Number.isNaN(Number(labId))) {
      throw new InternalServerErrorException('labId is required');
    }
    try {
      return await this.coursesService.completeLab(courseId, req.user.id, Number(labId));
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to complete lab');
    }
  }

  @Get(':courseId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtenir le contenu complet d\'un cours',
    description: 'Retourne les modules, leçons et labs du cours. Free/trial users can only access their one allowed course.',
  })
  @ApiParam({ name: 'courseId', type: String, example: 'AZ-900-UNIFIED', description: 'Identifiant string du cours' })
  @ApiResponse({ status: 200, description: 'Contenu du cours retourné.' })
  @ApiResponse({ status: 403, description: 'Upgrade required to access this course.' })
  @ApiResponse({ status: 404, description: 'Cours introuvable.' })
  async getCourseWithContent(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: { id: number; role?: string } },
    @Query('locale') locale?: string,
  ) {
    try {
      const userId = req.user?.id;
      const role = String(req.user?.role || '').toLowerCase();
      if (userId && role === 'learner') {
        const access = await this.subscriptionsService.resolveAccessProfile(userId);
        if (access.entitlements.maxCourses !== -1) {
          const enrolled = await this.coursesService.getEnrolledCourses(userId);
          const allowedCourseIds = new Set<string>();

          for (const row of enrolled) {
            if (row.courseId) {
              allowedCourseIds.add(String(row.courseId));
            }
            if (row.id != null) {
              allowedCourseIds.add(String(row.id));
            }
          }

          let effectiveCourseId = courseId;
          try {
            effectiveCourseId = await this.coursesService.resolveToContentCourseId(courseId);
          } catch {
            effectiveCourseId = courseId;
          }

          // Allow full certification journey when learner is enrolled in any segment
          // of a multi-course certification path.
          const enrolledCertIds = [
            ...new Set(
              enrolled
                .map((row) => (row.certificationId != null ? Number(row.certificationId) : NaN))
                .filter((id) => Number.isFinite(id) && id > 0),
            ),
          ];
          for (const certId of enrolledCertIds) {
            const cert = await this.certificationsService.findOne(certId);
            for (const c of cert.courses ?? []) {
              if (c.courseId) allowedCourseIds.add(String(c.courseId));
            }
          }

          if (allowedCourseIds.size === 0) {
            // No enrollment yet: preserve original free-plan fallback to first available course.
            const reqUser = req.user as any;
            const tracks = reqUser.track ? [reqUser.track] : [];
            const certs = await this.certificationsService.findAvailableForLearner({ tracks });
            if (certs.length > 0 && certs[0].courses && certs[0].courses.length > 0) {
              for (const c of certs[0].courses) {
                if (c.courseId) allowedCourseIds.add(String(c.courseId));
              }
            } else {
              const catalog = await this.coursesService.getCatalogForLearnerTracks(tracks);
              if (catalog.length > 0 && catalog[0].courseId) {
                allowedCourseIds.add(String(catalog[0].courseId));
              }
            }
          }

          if (
            !allowedCourseIds.has(courseId) &&
            !allowedCourseIds.has(effectiveCourseId)
          ) {
            throw new ForbiddenException('Upgrade your plan to access this course.');
          }
        }
      }
      return await this.coursesService.getCourseWithContent(courseId, locale ?? 'en');
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      throw new InternalServerErrorException('Failed to fetch course');
    }
  }
}
