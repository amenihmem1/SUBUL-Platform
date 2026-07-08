import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuizFeedbackService, CreateFeedbackDto } from './quiz-feedback.service';

@UseGuards(JwtAuthGuard)
@Controller('api/quiz-feedback')
export class QuizFeedbackController {
  constructor(private readonly service: QuizFeedbackService) {}

  @Post()
  @HttpCode(201)
  async report(
    @Req() req: { user: { id: number } },
    @Body() dto: CreateFeedbackDto,
  ) {
    const record = await this.service.create(req.user.id, dto);
    return { id: record.id, status: record.status };
  }
}
