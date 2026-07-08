import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { DailyGoal } from './entities/daily-goal.entity';
import { CreateDailyGoalDto } from './dto/create-daily-goal.dto';
import { UpdateDailyGoalDto } from './dto/update-daily-goal.dto';

@Injectable()
export class DailyGoalsService {
  constructor(
    @InjectRepository(DailyGoal)
    private dailyGoalsRepository: Repository<DailyGoal>,
  ) {}

  async create(createDailyGoalDto: CreateDailyGoalDto, userId: number): Promise<DailyGoal> {
    const dailyGoal = this.dailyGoalsRepository.create({
      ...createDailyGoalDto,
      userId,
      goalDate: createDailyGoalDto.goalDate || new Date(),
    });

    return this.dailyGoalsRepository.save(dailyGoal);
  }

  async findAll(userId: number): Promise<DailyGoal[]> {
    return this.dailyGoalsRepository.find({
      where: { userId },
      order: { goalDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findToday(userId: number): Promise<DailyGoal[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.dailyGoalsRepository.find({
      where: {
        userId,
        goalDate: Between(today, tomorrow),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findByDate(userId: number, date: Date): Promise<DailyGoal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.dailyGoalsRepository.find({
      where: {
        userId,
        goalDate: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: number, userId: number): Promise<DailyGoal> {
    const dailyGoal = await this.dailyGoalsRepository.findOne({ where: { id, userId } });
    if (!dailyGoal) {
      throw new NotFoundException(`Daily goal with ID ${id} not found`);
    }
    return dailyGoal;
  }

  async update(id: number, updateDailyGoalDto: UpdateDailyGoalDto, userId: number): Promise<DailyGoal> {
    const dailyGoal = await this.findOne(id, userId);
    
    Object.assign(dailyGoal, updateDailyGoalDto);
    return this.dailyGoalsRepository.save(dailyGoal);
  }

  async remove(id: number, userId: number): Promise<void> {
    const dailyGoal = await this.findOne(id, userId);
    await this.dailyGoalsRepository.remove(dailyGoal);
  }

  async toggleComplete(id: number, userId: number): Promise<DailyGoal> {
    const dailyGoal = await this.findOne(id, userId);
    
    if (dailyGoal.completed) {
      dailyGoal.markIncomplete();
    } else {
      dailyGoal.markCompleted();
    }
    
    return this.dailyGoalsRepository.save(dailyGoal);
  }

  async getTodayStats(userId: number): Promise<{
    total: number;
    completed: number;
    points: number;
  }> {
    const todayGoals = await this.findToday(userId);
    const completed = todayGoals.filter(g => g.completed);
    const points = completed.reduce((sum, goal) => sum + goal.points, 0);

    return {
      total: todayGoals.length,
      completed: completed.length,
      points,
    };
  }

  async getWeeklyStats(userId: number): Promise<{
    total: number;
    completed: number;
    points: number;
    averagePerDay: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyGoals = await this.dailyGoalsRepository.find({
      where: {
        userId,
        goalDate: MoreThanOrEqual(sevenDaysAgo),
      },
      order: { goalDate: 'ASC' },
    });

    const completed = weeklyGoals.filter(g => g.completed);
    const points = completed.reduce((sum, goal) => sum + goal.points, 0);
    const averagePerDay = Math.round(points / 7);

    return {
      total: weeklyGoals.length,
      completed: completed.length,
      points,
      averagePerDay,
    };
  }
}
