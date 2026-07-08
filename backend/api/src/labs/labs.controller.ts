import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LabsService } from './labs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { UpdateLabProgressDto } from './dto/update-lab-progress.dto';
import { Lab } from './entities/lab.entity';
import { LabProgress } from './entities/lab-progress.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('Labs')
@Controller('api/labs')
export class LabsController {
  constructor(
    private readonly labsService: LabsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private toLabResponse(lab: Lab) {
    return this.labsService.toPublicLabDto(lab);
  }

  private toLabProgressResponse(progress: LabProgress) {
    return {
      id: progress.id,
      userId: progress.userId,
      labId: progress.labId,
      completedTasks: progress.completedTasks ?? [],
      isCompleted: progress.isCompleted,
      startedAt: progress.startedAt ?? null,
      completedAt: progress.completedAt ?? null,
      notes: progress.notes ?? null,
      timeSpent: progress.timeSpent ?? 0,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
      lab: progress.lab ? this.toLabResponse(progress.lab) : undefined,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List published labs', description: 'Returns published labs, optionally filtered by track (cloud|cyber|ai).' })
  @ApiResponse({ status: 200, description: 'List of labs' })
  async findAll(@Query('track') track?: string, @Query('locale') locale = 'en') {
    const labs = await this.labsService.findAll(track);
    return labs.map((l) => this.labsService.toPublicLabDto(l, locale));
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'List all labs (Admin)', description: 'Returns draft/published/archived labs. Admin only.' })
  @ApiResponse({ status: 200, description: 'List of labs (admin)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  async findAllAdmin() {
    const labs = await this.labsService.findAllAdmin();
    return labs.map((l) => this.toLabResponse(l));
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Lab analytics (Admin)', description: 'Per-lab start/completion/time stats.' })
  @ApiResponse({ status: 200, description: 'Lab stats' })
  async getStats() {
    return this.labsService.getLabStats();
  }

  @Get('my/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Get my lab progress', description: 'Returns progress for all labs of the authenticated user.' })
  @ApiResponse({ status: 200, description: 'List of lab progress records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProgress(@Request() req: AuthenticatedRequest) {
    const rows = await this.labsService.getUserProgress(req.user);
    return rows.map((p) => this.toLabProgressResponse(p));
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get lab by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiResponse({ status: 200, description: 'Lab found' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  async findOne(@Param('slug') slug: string, @Query('locale') locale = 'en') {
    const lab = await this.labsService.findOne(slug, locale);
    return this.labsService.toPublicLabDto(lab, locale);
  }

  @Get(':slug/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Get lab progress', description: 'Returns progress for a specific lab.' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiResponse({ status: 200, description: 'Lab progress' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lab or progress not found' })
  async getLabProgress(@Request() req: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.toLabProgressResponse(await this.labsService.getUserProgressForLab(req.user, slug));
  }

  @Post(':slug/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Create or update lab progress' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiBody({ type: UpdateLabProgressDto })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async createOrUpdateProgress(
    @Request() req: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() updateProgressDto: UpdateLabProgressDto,
  ) {
    return this.toLabProgressResponse(await this.labsService.updateProgress(req.user, slug, updateProgressDto));
  }

  @Post(':slug/start')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Start a lab', description: 'Creates or returns existing progress. Free/trial users limited to 1 lab.' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiResponse({ status: 200, description: 'Lab progress (created or existing)' })
  @ApiResponse({ status: 403, description: 'Upgrade required to start this lab.' })
  async startLab(@Request() req: AuthenticatedRequest, @Param('slug') slug: string) {
    const userId = (req.user as any)?.id ?? (req.user as any)?.sub;
    const role = String((req.user as any)?.role || '').toLowerCase();
    if (userId && role === 'learner') {
      const access = await this.subscriptionsService.resolveAccessProfile(userId);
      if (access.entitlements.maxLabs !== -1) {
        const existing = await this.labsService.getUserProgress(req.user);
        const hasExistingForOtherLab = existing.some(
          (p) => p.lab?.slug && p.lab.slug !== slug,
        );
        if (hasExistingForOtherLab && !existing.some((p) => p.lab?.slug === slug)) {
          throw new ForbiddenException('Upgrade your plan to access additional labs.');
        }
      }
    }
    return this.toLabProgressResponse(await this.labsService.getOrCreateProgress(req.user, slug));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Create lab (Admin)' })
  @ApiBody({ type: CreateLabDto })
  @ApiResponse({ status: 201, description: 'Lab created' })
  async create(@Body() createLabDto: CreateLabDto) {
    return this.toLabResponse(await this.labsService.create(createLabDto));
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Update lab (Admin)' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiBody({ type: UpdateLabDto })
  @ApiResponse({ status: 200, description: 'Lab updated' })
  async update(@Param('slug') slug: string, @Body() updateLabDto: UpdateLabDto) {
    return this.toLabResponse(await this.labsService.update(slug, updateLabDto));
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Delete lab (Admin)' })
  @ApiParam({ name: 'slug', type: String, description: 'Lab slug' })
  @ApiResponse({ status: 200, description: 'Lab deleted' })
  async remove(@Param('slug') slug: string) {
    await this.labsService.remove(slug);
    return { message: `Lab ${slug} deleted successfully` };
  }

  @Post('seed/aws')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Seed labs (admin)' })
  @ApiResponse({ status: 200, description: 'Labs seeded' })
  async seedAwsLabs() {
    await this.labsService.seedAwsLabs();
    return { message: 'Labs seeded successfully' };
  }

  @Post('seed/aws-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Seed labs (Admin)' })
  @ApiResponse({ status: 200, description: 'Labs seeded' })
  async seedAwsLabsAdmin() {
    await this.labsService.seedAwsLabs();
    return { message: 'Labs seeded successfully' };
  }
}
