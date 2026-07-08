import {

  Controller,

  Get,

  Post,

  Body,

  Query,

  Param,

  Request,

  UseGuards,

  Res,

  HttpException,

  HttpStatus,

  UploadedFile,

  UseInterceptors,

  ParseFilePipe,

  MaxFileSizeValidator,
  StreamableFile,

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../common/upload.constants';

import { Response } from 'express';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Request as ExpressRequest } from 'express';

import { SkipAuth } from '../auth/decorators/skip-auth.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AgentsService } from './agents.service';

import type { User } from '../users/entities/user.entity';
import { JobSearchChatService } from './job-search-chat.service';



/**

 * Proxy to Python agents with auth. All routes require JWT.

 * Injects req.user.id (NestJS DB user) as user_id so agents use the real user.

 */

@ApiTags('Agents')

@Controller('api')

@UseGuards(JwtAuthGuard)

@ApiBearerAuth('access_token')


export class AgentsController {

  constructor(
    private readonly agentsService: AgentsService,
    private readonly jobSearchChatService: JobSearchChatService,
  ) {}



  private getUserId(req: ExpressRequest): number {

    const user = req.user as User;

    if (!user?.id) {

      throw new HttpException('User not found in request', HttpStatus.UNAUTHORIZED);

    }

    return user.id;

  }



  // ── Quiz Agent ─────────────────────────────────────────────────────────────



  @Get('quiz/assessment-questions')

  @ApiOperation({ summary: 'DEPRECATED: Use RoadmapAgent assessment instead', description: 'Redirects to RoadmapAgent assessment questions.' })

  async getQuizAssessmentQuestions(@Request() req: ExpressRequest) {

    const userId = this.getUserId(req);

    // Redirect to RoadmapAgent assessment questions

    return this.agentsService.proxyRoadmapAssessQuestions(userId, { lang: 'fr' });

  }



  @Post('quiz/generate')
  @ApiOperation({ summary: 'Generate module/course quiz (Quiz Agent)', description: 'Generates course-based QCM questions from RAG. For profile/level assessment use Roadmap Agent (roadmap/level/questions).' })
  async quizGenerate(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyQuizGenerate(userId, body);
  }

  @Post('quiz/evaluate')
  @ApiOperation({ summary: 'Evaluate module quiz answer (Quiz Agent)', description: 'Evaluates a single quiz answer. For level test evaluation use Roadmap Agent (roadmap/level/evaluate).' })
  async quizEvaluate(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyQuizEvaluate(userId, body);
  }



  @Post('quiz/session/end')

  @ApiOperation({ summary: 'DEPRECATED: Use RoadmapAgent instead', description: 'Quiz Agent deprecated. Use RoadmapAgent session end.' })

  async quizSessionEnd(@Request() req: ExpressRequest, @Body() body: { session_id?: string }) {

    const userId = this.getUserId(req);

    // Redirect to RoadmapAgent session end

    return this.agentsService.proxyRoadmapSessionEnd(userId, body);

  }



  // ── Roadmap Agent (Assessment + Level + Generate) ──────────────────────────



  @Post('roadmap/assess/questions')

  @ApiOperation({ summary: 'Get assessment questions (proxied to Roadmap Agent)', description: 'Requires auth.' })

  async roadmapAssessQuestions(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    return this.agentsService.proxyRoadmapAssessQuestions(userId, body);

  }



  @Post('roadmap/assess/message')

  @ApiOperation({ summary: 'Assessment conversational message (streaming)', description: 'Requires auth.' })

  async roadmapAssessMessage(@Request() req: ExpressRequest, @Res() res: Response, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    const stream = await this.agentsService.proxyRoadmapAssessMessage(userId, body);

    res.setHeader('Content-Type', 'application/x-ndjson');

    const reader = stream.getReader();

    const pump = async () => {

      const { done, value } = await reader.read();

      if (done) return;

      res.write(value);

      await pump();

    };

    await pump();

    res.end();

  }



  @Post('roadmap/assess/analyze')

  @ApiOperation({ summary: 'Analyze assessment profile (proxied to Roadmap Agent)', description: 'Requires auth.' })

  async roadmapAssessAnalyze(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    return this.agentsService.proxyRoadmapAssessAnalyze(userId, body);

  }



  @Post('roadmap/level/questions')

  @ApiOperation({ summary: 'Get level questions (proxied to Roadmap Agent)', description: 'Requires auth.' })

  async roadmapLevelQuestions(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    return this.agentsService.proxyRoadmapLevelQuestions(userId, body);

  }



  @Post('roadmap/level/evaluate')

  @ApiOperation({ summary: 'Evaluate level answers (proxied to Roadmap Agent)', description: 'Requires auth.' })

  async roadmapLevelEvaluate(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    return this.agentsService.proxyRoadmapLevelEvaluate(userId, body);

  }



  @Post('roadmap/agent/generate')

  @ApiOperation({ summary: 'Generate personalized roadmap (streaming, proxied to Roadmap Agent)', description: 'Requires auth. Frontend uses this for NDJSON stream. /api/roadmap/generate is DB-backed in RoadmapController.' })

  async roadmapAgentGenerate(@Request() req: ExpressRequest, @Res() res: Response, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    const stream = await this.agentsService.proxyRoadmapGenerate(userId, body);

    res.setHeader('Content-Type', 'application/x-ndjson');

    const reader = stream.getReader();

    const pump = async () => {

      const { done, value } = await reader.read();

      if (done) return;

      res.write(value);

      await pump();

    };

    await pump();

    res.end();

  }



  @Post('roadmap/session/end')

  @ApiOperation({ summary: 'End roadmap session (proxied to Roadmap Agent)', description: 'Requires auth.' })

  async roadmapSessionEnd(@Request() req: ExpressRequest, @Body() body: { session_id?: string }) {

    const userId = this.getUserId(req);

    return this.agentsService.proxyRoadmapSessionEnd(userId, body);

  }



  // ── CV Booster Agent ───────────────────────────────────────────────────────





  @Get('roadmap/certification-recommendations')

  @ApiOperation({ summary: 'Get certification recommendations based on user profile', description: 'Returns personalized certification recommendations using agent-based profile analysis.' })

  async getCertificationRecommendations(@Request() req: ExpressRequest) {

    const userId = this.getUserId(req);

    return this.agentsService.getCertificationRecommendations(userId);

  }








  // ── CV Booster Agent ───────────────────────────────────────────────────────

  @Post('cv/extract')
  @ApiOperation({ summary: 'Extract text from CV file (CV Booster)', description: 'Extracts text content from uploaded CV file and identifies missing sections.' })
  @UseInterceptors(FileInterceptor('file'))
  async extractCv(
    @Request() req: ExpressRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES }),
        ],
      }),
    ) file: Express.Multer.File,
  ) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyCvExtract(userId, file);
  }

  @Post('cv/save')
  @ApiOperation({ summary: 'Save enhanced CV to database (CV Booster)', description: 'Saves the enhanced CV with platform data to Cosmos DB.' })
  @UseInterceptors(FileInterceptor('file'))
  async saveCv(
    @Request() req: ExpressRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES }),
        ],
      }),
    ) file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyCvSave(userId, file, body);
  }

  @Get('cv/platform-data/:userId')
  @ApiOperation({ summary: 'Get platform data for CV enhancement', description: 'Retrieves user quiz results, labs, and certifications for CV enrichment.' })
  async getPlatformData(@Param('userId') userId: string) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
    return this.agentsService.getCvPlatformData(id);
  }

  @Get('cv/status')
  @ApiOperation({ summary: 'Get learner CV status', description: 'Returns backend-driven CV upload status and metadata for learner emploi pages.' })
  async getCvStatus(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return this.agentsService.getCvStatus(userId);
  }

  @Get('cv/document')
  @ApiOperation({ summary: 'Get learner saved CV document', description: 'Returns structured fields and full text from Cosmos for the View CV page.' })
  async getCvDocument(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return this.agentsService.getCvDocument(userId);
  }

  @Post('cv/boost')
  @ApiOperation({ summary: 'Boost/enhance CV (CV Booster)', description: 'Enhances CV with platform data and formatting.' })
  @UseInterceptors(FileInterceptor('file'))
  async boostCv(
    @Request() req: ExpressRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_FILE_SIZE_BYTES }),
        ],
        fileIsRequired: false,
      }),
    ) file: Express.Multer.File | undefined,
    @Body() body: Record<string, string>,
  ) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyCvBoost(userId, file, body);
  }

  @Post('cv/apply-format')
  @ApiOperation({ summary: 'Apply CV formatting (CV Booster)', description: 'Applies professional formatting to parsed CV content.' })
  async applyCvFormat(
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { parsed_cv: string; cv_format: string; photo_base64?: string },
  ) {
    const userId = this.getUserId(req);
    const buffer = await this.agentsService.proxyCvApplyFormat(userId, body.parsed_cv, body.cv_format, body.photo_base64);
    const format  = (body.cv_format || 'ats').toLowerCase();
    const ext     = 'docx';
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="cv_${format}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Post('cv/store-user')
  @SkipAuth()
  @ApiOperation({ summary: 'Store user in CV database (CV Booster)', description: 'Creates or updates a basic user document in Cosmos DB (PUBLIC - no auth required).' })
  async storeUser(
    @Body() body: { user_id: string },
  ) {
    return this.agentsService.proxyCvStoreUserPublic(body.user_id);
  }

  // ── Job Search Agent (proxied; all under /api/job-search) ─────────────────



 






















  // ── Job Search Agent ───────────────────────────────────────────────────────

  @Get('job-search/profile')
  @ApiOperation({ summary: 'Get user job search profile', description: 'Retrieves the user\'s job search profile from the agent.' })
  async getJobSearchProfile(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchGet(userId, '/api/profile');
  }

  @Post('job-search/profile')
  @ApiOperation({ summary: 'Update user job search profile', description: 'Updates the user\'s job search profile.' })
  async updateJobSearchProfile(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/profile', body);
  }

  @Get('job-search/chat/history')
  @ApiOperation({ summary: 'Get job-search chat history (Postgres)', description: 'Requires auth.' })
  async jobSearchChatHistory(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    const messages = await this.jobSearchChatService.getHistoryForUser(userId);
    return { messages };
  }

  @Post('job-search/chat/reset')
  @ApiOperation({ summary: 'Clear job-search chat history for current user', description: 'Requires auth.' })
  async jobSearchChatReset(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    await this.jobSearchChatService.clearForUser(userId);
    return { ok: true };
  }

  @Post('job-search/chat')
  @ApiOperation({ summary: 'Send chat message (Job Search LLM; history in Postgres)', description: 'Requires auth.' })
  async jobSearchChat(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    const history = await this.jobSearchChatService.getHistoryForUser(userId);
    const bodyWithHistory = { ...body, chat_history: history };
    const result = (await this.agentsService.proxyJobSearchPost(userId, '/api/chat', bodyWithHistory)) as {
      response?: string;
    };
    const msg = typeof body?.message === 'string' ? body.message.trim() : '';
    const answer = typeof result?.response === 'string' ? result.response : '';
    if (msg) {
      await this.jobSearchChatService.appendExchange(userId, msg, answer);
    }
    return result;
  }

  @Get('job-search/jobs')
  @ApiOperation({ summary: 'Search for jobs', description: 'Searches for jobs based on user profile and criteria.' })
  async searchJobs(@Request() req: ExpressRequest, @Query() query: Record<string, string>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchGet(userId, `/api/matches/${userId}`, query);
  }

  @Post('job-search/scan')
  @ApiOperation({
    summary: 'Run job scraping pipeline (SSE)',
    description: 'Proxies POST /scan to the Job Search agent. Streams SSE events until done.',
  })
  async jobSearchScan(
    @Request() req: ExpressRequest,
    @Res() res: Response,
    @Body() body: { cv_raw_text?: string; bypass_cache?: boolean; role_filter?: string; location_filter?: string },
  ) {
    const userId = this.getUserId(req);
    const stream = await this.agentsService.proxyJobSearchScanStream(
      userId,
      body?.cv_raw_text ?? '',
      {
        bypass_cache: body?.bypass_cache ?? false,
        role_filter: body?.role_filter ?? '',
        location_filter: body?.location_filter ?? '',
      },
    );
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const reader = stream.getReader();
    // Use a loop (not recursion) — 2000+ SSE chunks would overflow the call stack
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  }

  @Post('job-search/analyze-cv')
  @ApiOperation({ summary: 'Analyze CV for job matching', description: 'Analyzes the user\'s CV for job matching and suggestions.' })
  async analyzeCv(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/analyze-cv', body);
  }

  @Post('job-search/gap')
  @ApiOperation({ summary: 'Skills gap (Job Search agent)', description: 'POST /api/gap on the agent.' })
  async jobSearchGap(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/gap', body);
  }

  @Post('job-search/roadmap')
  @ApiOperation({ summary: 'Learning roadmap (Job Search agent)', description: 'POST /api/roadmap on the agent.' })
  async jobSearchRoadmap(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/roadmap', body);
  }

  @Post('job-search/ats-score')
  @ApiOperation({
    summary: 'ATS score vs job description (Job Search agent)',
    description: 'Proxies POST /api/ats-score. Body: job_description; user_id from JWT.',
  })
  async jobSearchAtsScore(
    @Request() req: ExpressRequest,
    @Body() body: { job_description?: string },
  ) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/ats-score', {
      job_description: body?.job_description ?? '',
    });
  }

  @Get('job-search/market')
  @ApiOperation({ summary: 'Market stats (Job Search agent)', description: 'GET /api/market on the agent.' })
  async jobSearchMarket(@Request() req: ExpressRequest, @Query() query: Record<string, string>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchGet(userId, '/api/market', query);
  }

  @Post('job-search/report')
  @ApiOperation({ summary: 'Career report markdown (Job Search agent)', description: 'POST /api/report on the agent.' })
  async jobSearchReport(@Request() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyJobSearchPost(userId, '/api/report', body);
  }

  // ── Cloud Tutor (03_Agents) ───────────────────────────────────────────────

  @Get('cloud-tutor/quota')
  @ApiOperation({ summary: 'Get Cloud Tutor voice credits (proxied)', description: 'Requires auth. Returns remaining and max voice credits.' })
  async cloudTutorQuota(@Request() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyCloudTutorQuota(userId);
  }

  @Post('cloud-tutor/chat')

  @ApiOperation({ summary: 'Chat with Cloud Tutor (streaming, proxied)', description: 'Requires auth.' })

  async cloudTutorChat(@Request() req: ExpressRequest, @Res() res: Response, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    const stream = await this.agentsService.proxyCloudTutorChatStream(userId, body);

    res.setHeader('Content-Type', 'application/x-ndjson');

    const reader = stream.getReader();

    const pump = async () => {

      const { done, value } = await reader.read();

      if (done) return;

      res.write(value);

      await pump();

    };

    await pump();

    res.end();

  }



  @Post('cloud-tutor/session/end')
  @ApiOperation({ summary: 'End Cloud Tutor session (triggers background summary)', description: 'Requires auth.' })
  async cloudTutorSessionEnd(@Request() req: ExpressRequest, @Body() body: { session_id?: string }) {
    const userId = this.getUserId(req);
    return this.agentsService.proxyCloudTutorSessionEnd(userId, body);
  }

  // ── Coach Agent ────────────────────────────────────────────────────────────



  @Post('coach/chat')

  @ApiOperation({ summary: 'Chat with Coach (streaming, proxied)', description: 'Requires auth.' })

  async coachChat(@Request() req: ExpressRequest, @Res() res: Response, @Body() body: Record<string, unknown>) {

    const userId = this.getUserId(req);

    const stream = await this.agentsService.proxyCoachChatStream(userId, body);

    res.setHeader('Content-Type', 'application/x-ndjson');

    const reader = stream.getReader();

    const pump = async () => {

      const { done, value } = await reader.read();

      if (done) return;

      res.write(value);

      await pump();

    };

    await pump();

    res.end();

  }

}

