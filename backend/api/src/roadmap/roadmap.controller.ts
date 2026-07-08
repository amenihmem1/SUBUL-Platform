import {
  Controller, Get, Post, Put, Body, Param, Request, UseGuards,
  HttpException, HttpStatus, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { RoadmapService } from './roadmap.service';
import { UpdateRoadmapProgressDto } from './dto/create-roadmap.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Roadmap')
@Controller('api/roadmap')
@UseGuards(JwtAuthGuard)
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get roadmap config (levels, goals, strengths, challenges)', description: 'Public config for roadmap UI.' })
  @ApiResponse({ status: 200, description: 'Config returned.' })
  async getConfig() {
    return {
      levelProgression: [
        { level: 'Beginner', label: 'Débutant', description: 'Fondamentaux', duration: '1-2 mois' },
        { level: 'Intermediate', label: 'Intermédiaire', description: 'Approfondissement', duration: '2-4 mois' },
        { level: 'Advanced', label: 'Avancé', description: 'Expertise', duration: '4-6 mois' },
        { level: 'Expert', label: 'Expert', description: 'Maîtrise', duration: '6+ mois' },
      ],
      careerGoals: ['Technology Professional', 'Cloud Architect', 'AI Engineer', 'ML Researcher', 'Data Scientist', 'Security Specialist'],
      strengths: ['Cloud Fundamentals', 'AI/ML Basics', 'Cybersecurity Awareness', 'Automation', 'Problem Solving'],
      challenges: ['Cloud Architect', 'AI Engineer', 'Data Scientist', 'DevOps Engineer', 'Security Analyst'],
    };
  }

  @Get()
  @ApiOperation({ summary: 'DEPRECATED: Use RoadmapAgent instead', description: 'Static roadmaps deprecated. Use RoadmapAgent assessment and generation endpoints.' })
  @ApiResponse({ status: 410, description: 'Static roadmaps deprecated. Use RoadmapAgent.' })
  async getRoadmap(@Request() req: ExpressRequest & { user: { id: number } }) {
    throw new HttpException('Static roadmaps deprecated. Use RoadmapAgent endpoints: POST /api/roadmap/assess/questions, POST /api/roadmap/level/questions, POST /api/roadmap/agent/generate', 410);
  }

  @Post('generate')
  @ApiOperation({ summary: 'DEPRECATED: Use RoadmapAgent instead', description: 'Static roadmap generation deprecated. Use POST /api/roadmap/agent/generate for AI-powered roadmaps.' })
  @ApiResponse({ status: 410, description: 'Static generation deprecated. Use RoadmapAgent.' })
  async generateRoadmap(@Request() req: ExpressRequest & { user: { id: number } }) {
    throw new HttpException('Static roadmap generation deprecated. Use POST /api/roadmap/agent/generate for AI-powered roadmaps.', 410);
  }

  @Put('progress/:moduleId')
  @ApiOperation({ summary: 'Mettre à jour la progression d\'un module', description: 'Met à jour le pourcentage et le statut d\'un module dans le roadmap de l\'utilisateur.' })
  @ApiParam({ name: 'moduleId', type: String, example: 'module-azure-fundamentals', description: 'ID du module' })
  @ApiBody({ type: UpdateRoadmapProgressDto })
  @ApiResponse({ status: 200, description: 'Progression mise à jour.' })
  @ApiResponse({ status: 404, description: 'Module introuvable.' })
  async updateProgress(@Param('moduleId') moduleId: string, @Body() updateDto: UpdateRoadmapProgressDto, @Request() req: ExpressRequest & { user: { id: number } }) {
    try {
      const userId = req.user.id;
      return await this.roadmapService.updateModuleProgress(userId, moduleId, updateDto);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      if ((error as Error).message.includes('not found')) throw new HttpException((error as Error).message, HttpStatus.NOT_FOUND);
      throw new HttpException('Failed to update progress', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Obtenir les analytics du roadmap', description: 'Retourne les statistiques : modules complétés, heures restantes, score moyen, forces, recommandations.' })
  @ApiResponse({ status: 200, description: 'Analytics retournés.' })
  async getAnalytics(@Request() req: ExpressRequest & { user: { id: number } }) {
    try {
      const userId = req.user.id;
      return await this.roadmapService.getRoadmapAnalytics(userId);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new HttpException('Failed to fetch analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Obtenir les détails d\'un module spécifique' })
  @ApiParam({ name: 'moduleId', type: String, example: 'module-azure-fundamentals', description: 'ID du module' })
  @ApiResponse({ status: 200, description: 'Détails du module retournés.' })
  @ApiResponse({ status: 404, description: 'Module introuvable.' })
  async getModule(@Param('moduleId') moduleId: string, @Request() req: ExpressRequest & { user: { id: number } }) {
    try {
      const userId = req.user.id;
      const roadmap = await this.roadmapService.getUserRoadmap(userId);
      const module = roadmap.modules.find((m: { id: string }) => m.id === moduleId);
      if (!module) throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
      return module;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      if ((error as Error).message?.includes('not found')) throw new HttpException((error as Error).message, HttpStatus.NOT_FOUND);
      throw new HttpException('Failed to fetch module', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Obtenir les recommandations d\'apprentissage', description: 'Retourne les sujets suggérés, les forces de l\'utilisateur et le temps estimé de complétion.' })
  @ApiResponse({ status: 200, schema: { example: { currentFocus: ['Azure VM', 'Storage'], strengths: ['Cloud Fundamentals'], suggestedTopics: ['Networking', 'Security'], estimatedCompletionTime: '3 months' } } })
  async getRecommendations(@Request() req: ExpressRequest & { user: { id: number } }) {
    try {
      const userId = req.user.id;
      const analytics = await this.roadmapService.getRoadmapAnalytics(userId);
      return {
        currentFocus: analytics.analytics.recommendedNextSteps,
        strengths: analytics.analytics.strengths,
        suggestedTopics: this.getSuggestedTopics(analytics.roadmap),
        estimatedCompletionTime: this.calculateEstimatedCompletion(analytics.roadmap),
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new HttpException('Failed to fetch recommendations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getSuggestedTopics(roadmap: any): string[] {
    const currentModule = roadmap.modules.find((m: any) => m.status === 'current');
    const upcomingModules = roadmap.modules.filter((m: any) => m.status === 'upcoming');
    const suggestions: string[] = [];
    if (currentModule && currentModule.progress < 50) suggestions.push(...currentModule.topics.slice(0, 2));
    if (upcomingModules.length > 0) suggestions.push(...upcomingModules[0].topics.slice(0, 2));
    return suggestions;
  }

  private calculateEstimatedCompletion(roadmap: any): string {
    const remainingModules = roadmap.modules.filter((m: any) => m.status !== 'completed');
    const totalHours = remainingModules.reduce((sum: number, m: any) => sum + m.estimatedHours, 0);
    if (totalHours === 0) return 'Completed';
    const weeksNeeded = Math.ceil(totalHours / 10);
    if (weeksNeeded <= 4) return `${weeksNeeded} weeks`;
    if (weeksNeeded <= 52) return `${Math.ceil(weeksNeeded / 4)} months`;
    return `${Math.ceil(weeksNeeded / 52)} years`;
  }
}
