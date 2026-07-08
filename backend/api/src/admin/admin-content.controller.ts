import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LabsService } from '../labs/labs.service';
import { CertificationsService } from '../certifications/certifications.service';
import { CreateLabDto } from '../labs/dto/create-lab.dto';
import { UpdateLabDto } from '../labs/dto/update-lab.dto';
import { CreateCertificationDto } from '../certifications/dto/create-certification.dto';
import { UpdateCertificationDto } from '../certifications/dto/update-certification.dto';
import { ContentImportService } from '../content-import/content-import.service';
import {
  AdminContentLabsQueryDto,
  ImportCertificationsJsonDto,
  ImportCoursesJsonDto,
  ImportCertificationPathsJsonDto,
  ImportPracticeExamsJsonDto,
  ImportLabsJsonDto,
  ValidateCoursesJsonDto,
} from '../content-import/dto/import-content.dto';

@ApiTags('Admin Content')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('api/admin/content')
export class AdminContentController {
  constructor(
    private readonly labsService: LabsService,
    private readonly certificationsService: CertificationsService,
    private readonly contentImportService: ContentImportService,
  ) {}

  @Post('import/courses-json')
  @ApiOperation({ summary: 'Import courses/certifications JSON with preview support' })
  @ApiBody({ type: ImportCoursesJsonDto })
  importCoursesJson(@Body() body: ImportCoursesJsonDto) {
    return this.contentImportService.importCoursesJson(body.payload, body.dryRun ?? true);
  }

  @Post('import/courses-json/validate')
  @ApiOperation({ summary: 'Validate courses JSON shape without touching the DB' })
  @ApiBody({ type: ValidateCoursesJsonDto })
  validateCoursesJson(@Body() body: ValidateCoursesJsonDto) {
    const errors = this.contentImportService.validateCoursesShape(body.payload);
    return { valid: errors.length === 0, errors };
  }

  @Get('labs')
  @ApiOperation({ summary: 'List interactive labs for admin content management' })
  async getLabs(@Query() query: AdminContentLabsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.toLowerCase().trim();
    const rows = await this.labsService.findAllAdmin();
    const filtered = search
      ? rows.filter((lab) =>
          (lab.slug ?? '').toLowerCase().includes(search) ||
          (lab.title ?? '').toLowerCase().includes(search) ||
          (lab.description ?? '').toLowerCase().includes(search),
        )
      : rows;
    const offset = (page - 1) * limit;
    const pageRows = filtered.slice(offset, offset + limit);
    return {
      data: pageRows.map((lab) => this.labsService.toPublicLabDto(lab)),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    };
  }

  @Post('labs')
  createLab(@Body() body: CreateLabDto) {
    return this.labsService.create(body);
  }

  @Patch('labs/:slug')
  updateLab(@Param('slug') slug: string, @Body() body: UpdateLabDto) {
    return this.labsService.update(slug, body);
  }

  @Delete('labs/:slug')
  async deleteLab(@Param('slug') slug: string) {
    await this.labsService.remove(slug);
    return { deleted: true, slug };
  }

  @Post('import/labs-json')
  @ApiBody({ type: ImportLabsJsonDto })
  importLabsJson(@Body() body: ImportLabsJsonDto) {
    return this.contentImportService.importLabsJson(body.payload, body.dryRun ?? true);
  }

  @Get('certifications/:id/full')
  getCertificationFull(@Param('id', ParseIntPipe) id: number) {
    return this.certificationsService.getAdminCertificationFull(id);
  }

  @Get('certifications')
  getCertifications(
    @Query('search') search?: string,
    @Query('status') status?: 'Active' | 'Draft' | 'Archived',
    @Query('provider') provider?: string,
  ) {
    return this.certificationsService.findAll({ search, status, provider });
  }

  @Post('certifications')
  createCertification(@Body() body: CreateCertificationDto) {
    return this.certificationsService.create(body);
  }

  @Patch('certifications/:id')
  updateCertification(@Param('id') id: string, @Body() body: UpdateCertificationDto) {
    return this.certificationsService.update(Number(id), body);
  }

  @Post('import/certifications-json')
  @ApiOperation({
    summary: 'Import certifications JSON (nested certif_courses or flat array)',
  })
  @ApiBody({ type: ImportCertificationsJsonDto })
  importCertificationsJson(@Body() body: ImportCertificationsJsonDto) {
    return this.contentImportService.importCertificationsJson(
      body.payload as any,
      body.dryRun ?? true,
    );
  }

  @Post('import/certification-paths-json')
  @ApiOperation({ summary: 'Import certification paths JSON (supports practice_exam steps)' })
  @ApiBody({ type: ImportCertificationPathsJsonDto })
  importCertificationPathsJson(@Body() body: ImportCertificationPathsJsonDto) {
    return this.contentImportService.importCertificationPathsJson(body.payload, body.dryRun ?? true);
  }

  @Post('import/practice-exams-json')
  @ApiOperation({ summary: 'Import practice exams JSON' })
  @ApiBody({ type: ImportPracticeExamsJsonDto })
  importPracticeExamsJson(@Body() body: ImportPracticeExamsJsonDto) {
    return this.contentImportService.importPracticeExamsJson(body.payload, body.dryRun ?? true);
  }
}
