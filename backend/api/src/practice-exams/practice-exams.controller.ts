import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PracticeExamsService } from './practice-exams.service';

@ApiTags('Practice Exams')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('api/practice-exams')
export class PracticeExamsController {
  constructor(private readonly practiceExamsService: PracticeExamsService) {}

  @Get()
  @ApiOperation({ summary: 'List learner-facing published practice exams' })
  list(@Req() req: Request & { user: { id: number } }) {
    return this.practiceExamsService.listForLearner(req.user.id);
  }

  @Get(':slug/session')
  @ApiOperation({ summary: 'Get practice exam session (questions without answers)' })
  session(
    @Req() req: Request & { user: { id: number } },
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
  ) {
    return this.practiceExamsService.getLearnerSession(req.user.id, slug, locale);
  }

  @Post(':slug/submit')
  @ApiOperation({ summary: 'Submit a practice exam attempt' })
  submit(
    @Req() req: Request & { user: { id: number } },
    @Param('slug') slug: string,
    @Body() body: { answers: Record<string, string | string[]>; timeSpent?: string },
  ) {
    return this.practiceExamsService.submitLearnerAttempt(req.user.id, slug, body.answers ?? {}, body.timeSpent);
  }

  @Get(':slug/attempts')
  @ApiOperation({ summary: 'Get learner attempt history for one practice exam' })
  attempts(@Req() req: Request & { user: { id: number } }, @Param('slug') slug: string) {
    return this.practiceExamsService.getLearnerAttempts(req.user.id, slug);
  }
}
