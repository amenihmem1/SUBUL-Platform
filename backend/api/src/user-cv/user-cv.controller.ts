import {
  Controller,
  Get,
  Post,
  Delete,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../common/upload.constants';
import { UserCvService, CvStatusResponse } from './user-cv.service';
import { AgentsService } from '../agents/agents.service';

const uploadDir = process.env.UPLOAD_DIR || './uploads/cvs';

// Only keep structured text fields from the agent response — never store raw file bytes in JSONB.
const SAFE_EXTRACTED_KEYS = [
  'role', 'seniority', 'years_exp', 'domain', 'industry', 'education',
  'skills', 'summary', 'bullets', 'languages', 'first_name', 'last_name',
  'email', 'linkedin', 'ats_score', 'ats_feedback',
];

function sanitizeExtractedData(raw: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of SAFE_EXTRACTED_KEYS) {
    if (raw[key] !== undefined) safe[key] = raw[key];
  }
  return safe;
}

@ApiTags('CV')
@Controller('api/cv')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access_token')
export class UserCvController {
  private readonly logger = new Logger(UserCvController.name);

  constructor(
    private readonly userCvService: UserCvService,
    private readonly agentsService: AgentsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get CV status for the authenticated user' })
  async getMyStatus(@Request() req: ExpressRequest): Promise<CvStatusResponse> {
    const userId = (req.user as any).id as number;
    const cv = await this.userCvService.findByUserId(userId);
    return this.userCvService.toStatusResponse(cv);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a CV file and trigger AI extraction' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const userId = (req.user as any)?.id ?? 'unknown';
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${userId}_${Date.now()}_${safeName}`);
        },
      }),
    }),
  )
  async uploadCv(
    @Request() req: ExpressRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<CvStatusResponse> {
    const userId = (req.user as any).id as number;

    // Step 1: Save file reference immediately so the user gets a fast response
    let savedCv;
    try {
      savedCv = await this.userCvService.upsert(userId, {
        filePath: file.path,
        fileName: file.originalname,
        fileSize: file.size,
        fileMime: file.mimetype,
      });
    } catch (err) {
      this.logger.error(`Failed to save CV record for user ${userId}: ${(err as Error).message}`);
      throw new HttpException('Failed to save CV record', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Step 2: Kick off AI extraction asynchronously (non-blocking)
    this.runExtractionAsync(userId, file).catch(err =>
      this.logger.warn(`Async CV extraction failed for user ${userId}: ${(err as Error).message}`)
    );

    return this.userCvService.toStatusResponse(savedCv);
  }

  private async runExtractionAsync(userId: number, file: Express.Multer.File): Promise<void> {
    try {
      const fileBuffer = fs.readFileSync(file.path);

      const agentResponse = await this.agentsService.proxyCvSave(
        userId,
        {
          buffer: fileBuffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
        },
        {},
      );

      const extractedData = sanitizeExtractedData(agentResponse as Record<string, unknown>);
      const atsScore = typeof agentResponse['ats_score'] === 'number'
        ? (agentResponse['ats_score'] as number)
        : undefined;

      await this.userCvService.upsert(userId, {
        extractedData,
        atsScore,
        lastAnalyzedAt: new Date(),
      });

      this.logger.log(`Async CV extraction complete for user ${userId}`);
    } catch (err) {
      this.logger.warn(`Async CV extraction failed for user ${userId}: ${(err as Error).message}`);
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the CV record for the authenticated user' })
  async deleteCv(@Request() req: ExpressRequest): Promise<{ message: string }> {
    const userId = (req.user as any).id as number;

    const existing = await this.userCvService.findByUserId(userId);
    if (existing?.filePath) {
      try {
        const absPath = path.resolve(existing.filePath);
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
      } catch (err) {
        this.logger.warn(`Could not delete CV file for user ${userId}: ${(err as Error).message}`);
      }
    }

    await this.userCvService.remove(userId);
    return { message: 'CV deleted successfully' };
  }
}
