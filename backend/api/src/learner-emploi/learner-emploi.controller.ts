import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../common/upload.constants';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';
import { LearnerEmploiService } from './learner-emploi.service';
import { User } from '../users/entities/user.entity';
import { AgentsService } from '../agents/agents.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Learner Emploi')
@Controller('api/learner-emploi')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@ApiBearerAuth('access_token')
export class LearnerEmploiController {
  constructor(
    private readonly learnerEmploiService: LearnerEmploiService,
    private readonly configService: ConfigService,
    private readonly agentsService: AgentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('jobs')
  @ApiOperation({
    summary: 'Aggregated jobs for learner emploi (platform + job-search + optional CV-aligned)',
    description:
      'Returns the same shape as CV boost aggregation without requiring a CV upload. Used to populate /learner/emploi when session storage is empty.',
  })
  async getAggregatedJobs(@Request() req: ExpressRequest) {
    const user = req.user as User | undefined;
    const userId = user?.id;
    if (userId == null) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const profile = await this.subscriptionsService.resolveAccessProfile(userId);
    const cap = this.subscriptionsService.maxJobOpportunities(profile);
    const topN = cap <= 0 ? 0 : Math.min(cap, 100);
    return this.agentsService.getJobSearchStartupJobs(userId, topN);
  }

  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Single aggregated job for offer detail',
    description: 'Resolves from merged learner emploi list or platform job UUID.',
  })
  async getJobById(@Request() req: ExpressRequest, @Param('jobId') jobId: string) {
    const user = req.user as User | undefined;
    const userId = user?.id;
    if (userId == null) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.agentsService.resolveLearnerEmploiJobById(userId, jobId);
  }

  @Post('analyze')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Analyze resume and aggregate matching jobs',
    description: 'Backend-native learner emploi flow: resume review + scraped jobs + ATS per job.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume'],
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
          description: 'Resume file (PDF/DOCX/TXT)',
        },
        target_role: { type: 'string', example: 'Backend Engineer' },
        locations: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', example: 'Remote,Tunis,Paris' },
          ],
        },
        remote_only: { type: 'boolean', example: false },
        max_jobs: { type: 'integer', minimum: 1, maximum: 200, example: 50 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Resume review + aggregated jobs + ATS score per job',
    schema: {
      type: 'object',
      properties: {
        resume_review: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            missing_sections: { type: 'array', items: { type: 'string' } },
            suggested_improvements: { type: 'array', items: { type: 'string' } },
            breakdown: {
              type: 'object',
              properties: {
                sections: { type: 'number' },
                skills: { type: 'number' },
                experience: { type: 'number' },
                formatting: { type: 'number' },
              },
            },
          },
        },
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              source: { type: 'string' },
              title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              remote: { type: 'boolean' },
              url: { type: 'string' },
              posted_at: { type: 'string' },
              salary: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              ats_score: { type: 'number' },
            },
          },
        },
        ats_by_job: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              job_id: { type: 'string' },
              score: { type: 'number' },
              breakdown: {
                type: 'object',
                properties: {
                  skills: { type: 'number' },
                  role: { type: 'number' },
                  experience: { type: 'number' },
                  keyword_coverage: { type: 'number' },
                },
              },
              missing_skills: { type: 'array', items: { type: 'string' } },
              suggestions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            duration_ms: { type: 'number' },
            sources_used: { type: 'array', items: { type: 'string' } },
            source_timings_ms: { type: 'object', additionalProperties: { type: 'number' } },
            total_scraped: { type: 'number' },
            total_returned: { type: 'number' },
            warnings: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES } }))
  async analyze(
    @Request() req: ExpressRequest,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES })],
      }),
    )
    file: { buffer: Buffer; mimetype: string; originalname: string },
    @Body() body: AnalyzeRequestDto,
  ): Promise<AnalyzeResponseDto> {
    const enabled = (this.configService.get<string>('LEARNER_EMPLOI_V2_ENABLED') ?? 'true').toLowerCase() === 'true';
    if (!enabled) {
      throw new HttpException(
        'Learner Emploi v2 is disabled. Enable LEARNER_EMPLOI_V2_ENABLED=true to cut over from legacy flow.',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const user = req.user as User | undefined;
      const userId = user?.id;
      return await this.learnerEmploiService.analyze(file, body, userId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { statusCode: HttpStatus.BAD_GATEWAY, message: (error as Error).message, error: 'Learner Emploi Error' },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
