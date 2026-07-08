import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyGoal } from './entities/weekly-goal.entity';
import { CreateWeeklyGoalDto } from './dto/create-weekly-goal.dto';
import { UpdateWeeklyGoalDto } from './dto/update-weekly-goal.dto';

@Injectable()
export class WeeklyGoalsService {
  constructor(
    @InjectRepository(WeeklyGoal)
    private weeklyGoalsRepository: Repository<WeeklyGoal>,
  ) {}

  async create(createWeeklyGoalDto: CreateWeeklyGoalDto, userId: number): Promise<WeeklyGoal> {
    const today = new Date();
    const currentWeek = this.getISOWeek(today);
    const currentYear = today.getFullYear();

    const weeklyGoal = this.weeklyGoalsRepository.create({
      ...createWeeklyGoalDto,
      userId,
      weekNumber: createWeeklyGoalDto.weekNumber || currentWeek,
      year: createWeeklyGoalDto.year || currentYear,
    });

    return this.weeklyGoalsRepository.save(weeklyGoal);
  }

  async findAll(userId: number): Promise<WeeklyGoal[]> {
    return this.weeklyGoalsRepository.find({
      where: { userId },
      order: { year: 'DESC', weekNumber: 'DESC' },
    });
  }

  async findCurrentWeek(userId: number): Promise<WeeklyGoal[]> {
    const today = new Date();
    const currentWeek = this.getISOWeek(today);
    const currentYear = today.getFullYear();

    return this.weeklyGoalsRepository.find({
      where: {
        userId,
        weekNumber: currentWeek,
        year: currentYear,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findByWeek(userId: number, weekNumber: number, year: number): Promise<WeeklyGoal[]> {
    return this.weeklyGoalsRepository.find({
      where: {
        userId,
        weekNumber,
        year,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number, userId: number): Promise<WeeklyGoal> {
    const weeklyGoal = await this.weeklyGoalsRepository.findOne({ where: { id, userId } });
    if (!weeklyGoal) {
      throw new NotFoundException(`Weekly goal with ID ${id} not found`);
    }
    return weeklyGoal;
  }

  async update(id: number, updateWeeklyGoalDto: UpdateWeeklyGoalDto, userId: number): Promise<WeeklyGoal> {
    const weeklyGoal = await this.findOne(id, userId);
    Object.assign(weeklyGoal, updateWeeklyGoalDto);
    return this.weeklyGoalsRepository.save(weeklyGoal);
  }

  async remove(id: number, userId: number): Promise<void> {
    const weeklyGoal = await this.findOne(id, userId);
    await this.weeklyGoalsRepository.remove(weeklyGoal);
  }

  async updateProgress(id: number, delta: number, userId: number): Promise<WeeklyGoal> {
    const weeklyGoal = await this.findOne(id, userId);
    weeklyGoal.updateProgress(delta);
    return this.weeklyGoalsRepository.save(weeklyGoal);
  }

  async getCurrentWeekStats(userId: number): Promise<{
    total: number;
    completed: number;
    averageProgress: number;
  }> {
    const currentWeekGoals = await this.findCurrentWeek(userId);
    const completed = currentWeekGoals.filter(g => g.isCompleted());
    const averageProgress = currentWeekGoals.length > 0 
      ? Math.round(currentWeekGoals.reduce((sum, g) => sum + g.progress, 0) / currentWeekGoals.length)
      : 0;

    return {
      total: currentWeekGoals.length,
      completed: completed.length,
      averageProgress,
    };
  }

  async getWeekRange(weekNumber: number, year: number): Promise<{
    startDate: Date;
    endDate: Date;
  }> {
    // ISO week: Monday is day 1, Sunday is day 7
    const jan1 = new Date(year, 0, 1);
    const daysUntilMonday = (8 - jan1.getDay() + 7) % 7;
    const firstMonday = new Date(year, 0, 1 + daysUntilMonday);
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      startDate: weekStart,
      endDate: weekEnd,
    };
  }

  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // January 4 is always in week 1
    const week1 = new Date(d.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }
}
