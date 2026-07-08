import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ContentIndexerService } from '../content-indexer/content-indexer.service';

@UseGuards(JwtAuthGuard, SubscriptionGuard, AdminGuard)
@Controller('api/admin/content-indexer')
export class AdminContentIndexerController {
  constructor(private readonly contentIndexerService: ContentIndexerService) {}

  // ── Global ──────────────────────────────────────────────────────────────

  @Post('sync')
  sync(@Body() body: { force?: boolean } = {}) {
    return this.contentIndexerService.syncAll(Boolean(body.force));
  }

  @Get('status')
  status() {
    return this.contentIndexerService.getStatus();
  }

  // ── Per-entity status ───────────────────────────────────────────────────

  @Get('courses-status')
  coursesStatus() {
    return this.contentIndexerService.getCoursesStatus();
  }

  @Get('labs-status')
  labsStatus() {
    return this.contentIndexerService.getLabsStatus();
  }

  @Get('certifications-status')
  certificationsStatus() {
    return this.contentIndexerService.getCertificationsStatus();
  }

  // ── Per-entity re-index ─────────────────────────────────────────────────

  @Post('reindex/course/:courseId')
  async reindexCourse(@Param('courseId') courseId: string) {
    const r = await this.contentIndexerService.reindexCourse(courseId);
    if (!r.ok) {
      throw new HttpException(
        { message: r.error ?? 'Re-index failed', result: r },
        400,
      );
    }
    return r;
  }

  @Post('reindex/lab/:slug')
  async reindexLab(@Param('slug') slug: string) {
    const r = await this.contentIndexerService.reindexLab(slug);
    if (!r.ok) {
      throw new HttpException(
        { message: r.error ?? 'Re-index failed', result: r },
        400,
      );
    }
    return r;
  }

  @Post('reindex/certification/:id')
  async reindexCertification(@Param('id') id: string) {
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      throw new HttpException('Invalid certification id', 400);
    }
    const r = await this.contentIndexerService.reindexCertification(numId);
    if (!r.ok) {
      throw new HttpException(
        { message: r.error ?? 'Re-index failed', result: r },
        400,
      );
    }
    return r;
  }

  // ── Test retrieval ──────────────────────────────────────────────────────

  @Post('test-retrieval/course/:courseId')
  testRetrievalCourse(
    @Param('courseId') courseId: string,
    @Body() body: { query?: string } = {},
  ) {
    return this.contentIndexerService.testRetrieval(
      'course',
      courseId,
      body.query,
    );
  }

  @Post('test-retrieval/lab/:slug')
  testRetrievalLab(
    @Param('slug') slug: string,
    @Body() body: { query?: string } = {},
  ) {
    return this.contentIndexerService.testRetrieval('lab', slug, body.query);
  }

  @Post('test-retrieval/certification/:id')
  testRetrievalCertification(
    @Param('id') id: string,
    @Body() body: { query?: string } = {},
  ) {
    return this.contentIndexerService.testRetrieval(
      'certification',
      id,
      body.query,
    );
  }
}
