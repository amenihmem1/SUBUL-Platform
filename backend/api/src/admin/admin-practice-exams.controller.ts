import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PracticeExamsService } from '../practice-exams/practice-exams.service';
import {
  AdminPracticeExamsQueryDto,
  CreatePracticeExamDto,
  ImportPracticeExamsJsonDto,
  UpdatePracticeExamDto,
  ValidatePracticeExamsJsonDto,
} from '../practice-exams/dto/practice-exam.dto';

@ApiTags('Admin Content')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/content/practice-exams')
export class AdminPracticeExamsController {
  constructor(private readonly practiceExamsService: PracticeExamsService) {}

  @Get()
  @ApiOperation({ summary: 'List practice exams (admin)' })
  list(@Query() query: AdminPracticeExamsQueryDto) {
    return this.practiceExamsService.listAdmin({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      certificationId: query.certificationId,
    });
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.practiceExamsService.getBySlug(slug);
  }

  @Post()
  create(@Body() body: CreatePracticeExamDto) {
    return this.practiceExamsService.create(body);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() body: UpdatePracticeExamDto) {
    return this.practiceExamsService.update(slug, body);
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.practiceExamsService.remove(slug);
  }

  @Post('import-json')
  @ApiOperation({ summary: 'Import practice exams from a JSON array (idempotent by slug)' })
  @ApiBody({ type: ImportPracticeExamsJsonDto })
  importJson(@Body() body: ImportPracticeExamsJsonDto) {
    return this.practiceExamsService.importFromJson(body.payload, body.dryRun ?? true);
  }

  @Post('import-json/validate')
  @ApiOperation({ summary: 'Validate practice-exams JSON shape without DB writes' })
  @ApiBody({ type: ValidatePracticeExamsJsonDto })
  validate(@Body() body: ValidatePracticeExamsJsonDto) {
    const errors = this.practiceExamsService.validateShape(body.payload);
    return { valid: errors.length === 0, errors };
  }
}
