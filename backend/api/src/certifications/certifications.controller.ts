import {
  Controller, Get, Post, Body, Put, Param, Delete, Patch, Query, Req, ParseIntPipe, UseGuards, Res,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Response } from 'express';
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { ToggleAvailabilityDto } from './dto/toggle-availability.dto';
import { ImportCertifCoursesDto } from './dto/import-certif-courses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CertifCoursesImportService } from './certif-courses-import.service';
import type { CertificationPathStepType } from './entities/certification-path.entity';

@ApiTags('Certifications')
@Controller('api/admin/certifications')
@UseGuards(JwtAuthGuard)
export class CertificationsController {
  constructor(
    private readonly certificationsService: CertificationsService,
    private readonly certifCoursesImportService: CertifCoursesImportService,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lister toutes les certifications', description: 'Retourne la liste des certifications avec filtres optionnels.' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par titre ou description' })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Draft', 'Archived'], description: 'Filtrer par statut' })
  @ApiQuery({ name: 'provider', required: false, description: 'Filtrer par fournisseur (ex: Microsoft, AWS)' })
  @ApiResponse({ status: 200, description: 'Liste des certifications retournée avec succès.' })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: 'Active' | 'Draft' | 'Archived',
    @Query('provider') provider?: string,
  ) {
    return this.certificationsService.findAll({ search, status, provider });
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer une certification', description: 'Crée une nouvelle certification (Admin).' })
  @ApiBody({ type: CreateCertificationDto })
  @ApiResponse({ status: 201, description: 'Certification créée.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  create(@Body() createCertificationDto: CreateCertificationDto) {
    return this.certificationsService.create(createCertificationDto);
  }

  @Post('import/certif-courses')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Importer certif_courses.json', description: 'Importe certifications/cours/modules/lessons via upsert idempotent.' })
  @ApiBody({ type: ImportCertifCoursesDto, required: false })
  @ApiResponse({ status: 201, description: 'Import terminé avec résumé.' })
  importCertifCourses(@Body() body: ImportCertifCoursesDto = {}) {
    return this.certifCoursesImportService.importFromFile(body.filePath, body.mode ?? 'upsert_only');
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Obtenir une certification par ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiResponse({ status: 200, description: 'Certification retournée.' })
  @ApiResponse({ status: 404, description: 'Certification introuvable.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.certificationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour une certification' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiBody({ type: UpdateCertificationDto })
  @ApiResponse({ status: 200, description: 'Certification mise à jour.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCertificationDto: UpdateCertificationDto) {
    return this.certificationsService.update(id, updateCertificationDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une certification' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiResponse({ status: 200, description: 'Certification supprimée.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.certificationsService.remove(id);
  }

  @Patch(':id/availability')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Activer / désactiver la disponibilité', description: 'Rend une certification visible ou non pour les apprenants.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiBody({ type: ToggleAvailabilityDto })
  @ApiResponse({ status: 200, description: 'Disponibilité mise à jour.' })
  toggleAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() toggleAvailabilityDto: ToggleAvailabilityDto,
  ) {
    return this.certificationsService.toggleAvailability(id, toggleAvailabilityDto);
  }

  @Patch(':id/link-course')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lier un cours à une certification' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiBody({ schema: { type: 'object', properties: { courseId: { type: 'string', example: 'AZ-900-UNIFIED' } } } })
  @ApiResponse({ status: 200, description: 'Cours lié à la certification.' })
  linkCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body('courseId') courseStringId: string,
  ) {
    return this.certificationsService.linkCourse(id, courseStringId);
  }

  @Get(':id/path')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get certification path (admin)' })
  getCertificationPath(@Param('id', ParseIntPipe) id: number) {
    return this.certificationsService.getCertificationPathForAdmin(id);
  }

  @Put(':id/path')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Replace certification path steps (admin)' })
  updateCertificationPath(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
    @Body()
    body: {
      steps: Array<{
        stepType: CertificationPathStepType;
        stepRef: string;
        title: string;
        description?: string;
      }>;
    },
  ) {
    return this.certificationsService.saveCertificationPath(id, body.steps ?? [], req.user.id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Inscrire l\'utilisateur connecté à une certification', description: 'Crée une entrée UserCourseProgress pour le premier cours de la certification.' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiResponse({ status: 201, description: 'Inscription réussie.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async enroll(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: { id: number } }) {
    return this.certificationsService.enrollUserInCertification(req.user.id, id);
  }

  @Get(':id/enrollment')
  @ApiOperation({ summary: 'Vérifier le statut d\'inscription de l\'utilisateur connecté' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la certification' })
  @ApiResponse({ status: 200, description: 'Statut d\'inscription retourné.' })
  async enrollmentStatus(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: { id: number } }) {
    return this.certificationsService.getEnrollmentStatus(req.user.id, id);
  }

  @Get('issued/:id/download')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Download an issued certificate as PDF (admin)' })
  @ApiParam({ name: 'id', type: Number, description: 'Issued certificate ID' })
  async adminDownloadIssuedCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filename, buffer } = await this.certificationsService.buildIssuedCertificatePdfForAdmin(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(buffer);
  }
}
