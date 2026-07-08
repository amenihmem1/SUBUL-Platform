import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmitExamDto } from './dto/submit-exam.dto';

@ApiTags('Exams')
@ApiBearerAuth('access_token')
@Controller('api/exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'Get exams', description: 'Returns upcoming and completed exams with streak and stats.' })
  @ApiResponse({
    status: 200,
    description: 'Exams data',
    schema: {
      example: {
        upcoming: [],
        completed: [],
        streak: 0,
        stats: { upcoming: 0, completed: 0, passed: 0, avgScore: 0, total: 0 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getExams(@Req() req: Request & { user: { id: number } }) {
    return this.examsService.getExams(req.user.id);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get exam streak', description: 'Returns the current exam streak count.' })
  @ApiResponse({ status: 200, description: 'Streak count', schema: { example: { streak: 0 } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStreak(@Req() req: Request & { user: { id: number } }) {
    return this.examsService.getStreak(req.user.id);
  }

  @Get(':examId/session')
  @ApiOperation({
    summary: 'Start exam session',
    description: 'Returns exam metadata and questions without correct answers. Fails if already attempted.',
  })
  @ApiParam({ name: 'examId', type: Number })
  @ApiResponse({ status: 200, description: 'Session payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 409, description: 'Already completed' })
  getExamSession(
    @Req() req: Request & { user: { id: number } },
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.examsService.getExamSession(req.user.id, examId);
  }

  @Post(':examId/submit')
  @ApiOperation({ summary: 'Submit exam answers', description: 'Grades the attempt and records results.' })
  @ApiParam({ name: 'examId', type: Number })
  @ApiBody({ type: SubmitExamDto })
  @ApiResponse({ status: 201, description: 'Graded result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 409, description: 'Already completed' })
  submitExam(
    @Req() req: Request & { user: { id: number } },
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: SubmitExamDto,
  ) {
    return this.examsService.submitExam(req.user.id, examId, body);
  }
}
