import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { QuizFeedbackService, } from './quiz-feedback.service';
import { FeedbackStatus } from './quiz-feedback.entity';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/quiz-feedback')
export class AdminQuizFeedbackController {
  constructor(private readonly service: QuizFeedbackService) {}

  @Get()
  list(
    @Query('status') status?: FeedbackStatus,
    @Query('courseId') courseId?: string,
  ) {
    return this.service.listAll(status, courseId);
  }

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: FeedbackStatus,
  ) {
    await this.service.updateStatus(id, status);
    return { updated: true };
  }
}
