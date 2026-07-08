import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyGoalsService } from './daily-goals.service';
import { WeeklyGoalsService } from './weekly-goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateDailyGoalDto } from './dto/create-daily-goal.dto';
import { UpdateDailyGoalDto } from './dto/update-daily-goal.dto';
import { CreateWeeklyGoalDto } from './dto/create-weekly-goal.dto';
import { UpdateWeeklyGoalDto } from './dto/update-weekly-goal.dto';
import { GoalCategory, GoalPriority, GoalStatus } from './entities/goal.entity';
import { User } from '../users/entities/user.entity';

@ApiTags('Goals')
@ApiBearerAuth('access_token')
@Controller('api/goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly dailyGoalsService: DailyGoalsService,
    private readonly weeklyGoalsService: WeeklyGoalsService,
  ) {}

  private getUser(req: Request): User {
    const user = (req as any).user;
    if (!user) {
      throw new UnauthorizedException('No active session');
    }
    return user;
  }

  // ── Main Goals ─────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a goal', description: 'Creates a new long-term goal for the authenticated user.' })
  @ApiBody({ type: CreateGoalDto })
  @ApiResponse({ status: 201, description: 'Goal created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createGoalDto: CreateGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.goalsService.create(createGoalDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List goals', description: 'Returns all goals for the authenticated user, with optional filters.' })
  @ApiQuery({ name: 'search',   required: false, description: 'Text search across goal title/description' })
  @ApiQuery({ name: 'category', required: false, enum: GoalCategory, description: 'Filter by category' })
  @ApiQuery({ name: 'priority', required: false, enum: GoalPriority, description: 'Filter by priority' })
  @ApiQuery({ name: 'status',   required: false, enum: GoalStatus,   description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'List of goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('category') category?: GoalCategory,
    @Query('priority') priority?: GoalPriority,
    @Query('status') status?: GoalStatus
  ) {
    const user = await this.getUser(req);
    return this.goalsService.findAll(user.id, { category, priority, status, search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get goal statistics', description: 'Returns aggregated statistics (counts by status, priority, etc.) for the authenticated user.' })
  @ApiResponse({ status: 200, description: 'Goal statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGoalStats(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.goalsService.getGoalStats(user.id);
  }

  // Daily and weekly routes must come before :id to avoid matching 'daily'/'weekly' as id
  @Post('daily')
  @ApiOperation({ summary: 'Create a daily goal' })
  @ApiBody({ type: CreateDailyGoalDto })
  @ApiResponse({ status: 201, description: 'Daily goal created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDaily(@Body() createDailyGoalDto: CreateDailyGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.create(createDailyGoalDto, user.id);
  }

  @Get('daily')
  @ApiOperation({ summary: 'List all daily goals' })
  @ApiResponse({ status: 200, description: 'List of daily goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllDaily(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.findAll(user.id);
  }

  @Get('daily/today')
  @ApiOperation({ summary: "Get today's daily goals" })
  @ApiResponse({ status: 200, description: "Today's goals" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findTodayDaily(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.findToday(user.id);
  }

  @Get('daily/stats')
  @ApiOperation({ summary: "Get today's daily goal statistics" })
  @ApiResponse({ status: 200, description: 'Daily stats (completion rate, count, etc.)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTodayStats(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.getTodayStats(user.id);
  }

  @Get('daily/weekly-stats')
  @ApiOperation({ summary: 'Get weekly statistics for daily goals' })
  @ApiResponse({ status: 200, description: 'Weekly stats for daily goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWeeklyStats(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.getWeeklyStats(user.id);
  }

  @Get('daily/by-date/:date')
  @ApiOperation({ summary: 'Get daily goals by date', description: 'Returns daily goals for a specific date. Format: YYYY-MM-DD.' })
  @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format', type: String, example: '2026-03-08' })
  @ApiResponse({ status: 200, description: 'Daily goals for specified date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findDailyByDate(@Param('date') date: string, @Req() req: Request) {
    const user = await this.getUser(req);
    const targetDate = new Date(date);
    return this.dailyGoalsService.findByDate(user.id, targetDate);
  }

  @Get('daily/by-id/:id')
  @ApiOperation({ summary: 'Get a daily goal by ID' })
  @ApiParam({ name: 'id', description: 'Daily Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Daily goal found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOneDaily(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.findOne(+id, user.id);
  }

  @Patch('daily/:id')
  @ApiOperation({ summary: 'Update a daily goal by ID' })
  @ApiParam({ name: 'id', description: 'Daily Goal ID', type: Number })
  @ApiBody({ type: UpdateDailyGoalDto })
  @ApiResponse({ status: 200, description: 'Daily goal updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateDaily(@Param('id') id: string, @Body() updateDailyGoalDto: UpdateDailyGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.update(+id, updateDailyGoalDto, user.id);
  }

  @Patch('daily/:id/toggle')
  @ApiOperation({ summary: 'Toggle daily goal completion', description: 'Toggles the completed status of a daily goal.' })
  @ApiParam({ name: 'id', description: 'Daily Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Completion toggled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async toggleDailyComplete(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.toggleComplete(+id, user.id);
  }

  @Delete('daily/:id')
  @ApiOperation({ summary: 'Delete a daily goal by ID' })
  @ApiParam({ name: 'id', description: 'Daily Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Daily goal deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeDaily(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.dailyGoalsService.remove(+id, user.id);
  }

  @Post('weekly')
  @ApiOperation({ summary: 'Create a weekly goal' })
  @ApiBody({ type: CreateWeeklyGoalDto })
  @ApiResponse({ status: 201, description: 'Weekly goal created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWeekly(@Body() createWeeklyGoalDto: CreateWeeklyGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.create(createWeeklyGoalDto, user.id);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'List all weekly goals' })
  @ApiResponse({ status: 200, description: 'List of weekly goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllWeekly(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.findAll(user.id);
  }

  @Get('weekly/current')
  @ApiOperation({ summary: 'Get current week goals', description: 'Returns weekly goals for the current ISO week.' })
  @ApiResponse({ status: 200, description: 'Current week goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findCurrentWeekly(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.findCurrentWeek(user.id);
  }

  @Get('weekly/current/stats')
  @ApiOperation({ summary: 'Get current week statistics', description: 'Returns completion statistics for the current ISO week.' })
  @ApiResponse({ status: 200, description: 'Current week statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentWeekStats(@Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.getCurrentWeekStats(user.id);
  }

  @Get('weekly/:weekNumber/:year')
  @ApiOperation({ summary: 'Get weekly goals by week number and year' })
  @ApiParam({ name: 'weekNumber', description: 'ISO week number (1-53)', type: Number, example: 10 })
  @ApiParam({ name: 'year',       description: 'Year', type: Number, example: 2026 })
  @ApiResponse({ status: 200, description: 'Weekly goals for specified week' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findWeeklyByWeek(
    @Param('weekNumber') weekNumber: string,
    @Param('year') year: string,
    @Req() req: Request
  ) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.findByWeek(user.id, +weekNumber, +year);
  }

  @Get('weekly/:id')
  @ApiOperation({ summary: 'Get a weekly goal by ID' })
  @ApiParam({ name: 'id', description: 'Weekly Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Weekly goal found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOneWeekly(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.findOne(+id, user.id);
  }

  @Patch('weekly/:id')
  @ApiOperation({ summary: 'Update a weekly goal by ID' })
  @ApiParam({ name: 'id', description: 'Weekly Goal ID', type: Number })
  @ApiBody({ type: UpdateWeeklyGoalDto })
  @ApiResponse({ status: 200, description: 'Weekly goal updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateWeekly(@Param('id') id: string, @Body() updateWeeklyGoalDto: UpdateWeeklyGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.update(+id, updateWeeklyGoalDto, user.id);
  }

  @Patch('weekly/:id/progress')
  @ApiOperation({ summary: 'Update weekly goal progress', description: 'Increments or decrements the current value of a weekly goal by a delta.' })
  @ApiParam({ name: 'id', description: 'Weekly Goal ID', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { delta: { type: 'number', example: 1, description: 'Amount to add (positive) or subtract (negative)' } }, required: ['delta'] } })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateWeeklyProgress(
    @Param('id') id: string,
    @Body('delta') delta: number,
    @Req() req: Request
  ) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.updateProgress(+id, delta, user.id);
  }

  @Delete('weekly/:id')
  @ApiOperation({ summary: 'Delete a weekly goal by ID' })
  @ApiParam({ name: 'id', description: 'Weekly Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Weekly goal deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeWeekly(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.weeklyGoalsService.remove(+id, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Goal found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.goalsService.findOne(+id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal ID', type: Number })
  @ApiBody({ type: UpdateGoalDto })
  @ApiResponse({ status: 200, description: 'Goal updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() updateGoalDto: UpdateGoalDto, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.goalsService.update(+id, updateGoalDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal ID', type: Number })
  @ApiResponse({ status: 200, description: 'Goal deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = await this.getUser(req);
    return this.goalsService.remove(+id, user.id);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Add a milestone to a goal', description: 'Appends a new milestone string to an existing goal.' })
  @ApiParam({ name: 'id', description: 'Goal ID', type: Number })
  @ApiBody({ schema: { type: 'object', properties: { milestone: { type: 'string', example: 'Complete module 3' } }, required: ['milestone'] } })
  @ApiResponse({ status: 201, description: 'Milestone added' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addMilestone(
    @Param('id') id: string,
    @Body('milestone') milestone: string,
    @Req() req: Request
  ) {
    const user = await this.getUser(req);
    return this.goalsService.addMilestone(+id, milestone, user.id);
  }

  @Delete(':id/milestones/:milestone')
  @ApiOperation({ summary: 'Remove a milestone from a goal' })
  @ApiParam({ name: 'id',        description: 'Goal ID',   type: Number })
  @ApiParam({ name: 'milestone', description: 'Milestone text to remove', type: String })
  @ApiResponse({ status: 200, description: 'Milestone removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeMilestone(
    @Param('id') id: string,
    @Param('milestone') milestone: string,
    @Req() req: Request
  ) {
    const user = await this.getUser(req);
    return this.goalsService.removeMilestone(+id, milestone, user.id);
  }

}
