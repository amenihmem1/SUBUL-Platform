import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { QuizResultsService } from './quiz-results.service';
import { CreateAssessmentResultDto } from './dto/create-assessment-result.dto';
import { CreateQuizLevelResultDto } from './dto/create-quiz-level-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quiz Results')
@Controller('api/quiz-results')
@UseGuards(JwtAuthGuard)
export class QuizResultsController {
  constructor(private readonly quizResultsService: QuizResultsService) {}

  @Post('assessment')
  @ApiOperation({ summary: 'Sauvegarder un résultat d\'assessment profil', description: 'Enregistre le résultat du quiz de détection de profil (Cloud/Cyber/IA). Incrément le compteur de tentatives et définit isLatest=true.' })
  @ApiBody({ type: CreateAssessmentResultDto })
  @ApiResponse({ status: 201, description: 'Résultat d\'assessment sauvegardé.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async createAssessmentResult(@Body() createAssessmentResultDto: CreateAssessmentResultDto, @Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.createAssessmentResult({ ...createAssessmentResultDto, userId: req.user.id });
  }

  @Get('assessment/latest')
  @ApiOperation({ summary: 'Obtenir le dernier résultat d\'assessment', description: 'Retourne le résultat d\'assessment le plus récent de l\'utilisateur connecté.' })
  @ApiResponse({ status: 200, description: 'Dernier résultat retourné.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async getLatestAssessmentResult(@Request() req: ExpressRequest & { user: { id: number } }) {
    const result = await this.quizResultsService.findLatestAssessmentResult(req.user.id);
    return result;
  }

  @Get('assessment/attempts-count')
  @ApiOperation({ summary: 'Compter les tentatives d\'assessment', description: 'Retourne le nombre de tentatives d\'assessment de l\'utilisateur connecté.' })
  @ApiResponse({ status: 200, description: 'Nombre de tentatives.', schema: { example: { attemptsCount: 3 } } })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async getAssessmentAttemptsCount(@Request() req: ExpressRequest & { user: { id: number } }) {
    const count = await this.quizResultsService.getAssessmentAttemptsCount(req.user.id);
    return { attemptsCount: count };
  }

  @Get('assessment/history')
  @ApiOperation({ summary: 'Historique de tous les assessments de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des résultats d\'assessment.' })
  async getAssessmentHistory(@Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.findAllAssessmentResults(req.user.id);
  }

  @Post('level')
  @ApiOperation({ summary: 'Sauvegarder un résultat de test de niveau', description: 'Enregistre le résultat du quiz de niveau (Débutant / Intermédiaire / Expert) pour un domaine.' })
  @ApiBody({ type: CreateQuizLevelResultDto })
  @ApiResponse({ status: 201, description: 'Résultat de test de niveau sauvegardé.' })
  async createQuizLevelResult(@Body() createQuizLevelResultDto: CreateQuizLevelResultDto, @Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.createQuizLevelResult({ ...createQuizLevelResultDto, userId: req.user.id });
  }

  @Get('level/latest')
  @ApiOperation({ summary: 'Dernier résultat de test de niveau pour un domaine' })
  @ApiQuery({ name: 'domain', required: false, enum: ['devops', 'ai', 'cyber'], description: 'Domaine cible' })
  @ApiResponse({ status: 200, description: 'Dernier résultat de niveau retourné.' })
  async getLatestQuizLevelResult(@Query('domain') domain: string, @Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.findLatestQuizLevelResult(req.user.id, domain);
  }

  @Get('level/history')
  @ApiOperation({ summary: 'Historique des tests de niveau pour un domaine' })
  @ApiQuery({ name: 'domain', required: false, enum: ['devops', 'ai', 'cyber'], description: 'Domaine cible' })
  @ApiResponse({ status: 200, description: 'Historique des tests de niveau.' })
  async getQuizLevelHistory(@Query('domain') domain: string, @Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.findAllQuizLevelResults(req.user.id, domain);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique complet (assessment + niveaux) de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Historique combiné retourné.' })
  async getQuizHistory(@Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.getUserQuizHistory(req.user.id);
  }

  @Get('roadmap')
  @ApiOperation({ summary: 'Générer un roadmap personnalisé depuis les résultats quiz', description: 'Analyse le dernier assessment et les tests de niveau pour générer un roadmap statique.' })
  @ApiResponse({ status: 200, description: 'Roadmap personnalisé généré.' })
  async getPersonalizedRoadmap(@Request() req: ExpressRequest & { user: { id: number } }) {
    return this.quizResultsService.generatePersonalizedRoadmap(req.user.id);
  }
}
