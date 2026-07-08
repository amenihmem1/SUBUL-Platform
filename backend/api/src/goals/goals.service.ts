import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from './entities/goal.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
  ) {}

  async create(createGoalDto: CreateGoalDto, userId: number): Promise<Goal> {
    const now = new Date();
    const goal = this.goalsRepository.create({
      ...createGoalDto,
      userId,
      milestones: JSON.stringify(createGoalDto.milestones || []),
      completedMilestones: JSON.stringify(createGoalDto.completedMilestones || []),
      createdAt: now,
      updatedAt: now,
    });

    return this.goalsRepository.save(goal);
  }

  async findAll(userId: number, filters?: {
    category?: GoalCategory;
    priority?: GoalPriority;
    status?: GoalStatus;
    search?: string;
  }): Promise<Goal[]> {
    const where: any = { userId };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.title = Like(`%${filters.search}%`);
    }

    return this.goalsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({ where: { id, userId } });
    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }
    return goal;
  }

  async update(id: number, updateGoalDto: UpdateGoalDto, userId: number): Promise<Goal> {
    const goal = await this.findOne(id, userId);

    // Update milestones if provided
    if (updateGoalDto.milestones !== undefined) {
      goal.setMilestones(updateGoalDto.milestones || []);
      delete updateGoalDto.milestones;
    }
    if (updateGoalDto.completedMilestones !== undefined) {
      goal.setCompletedMilestones(updateGoalDto.completedMilestones || []);
      delete updateGoalDto.completedMilestones;
    }

    Object.assign(goal, updateGoalDto);
    return this.goalsRepository.save(goal);
  }

  async remove(id: number, userId: number): Promise<void> {
    const goal = await this.findOne(id, userId);
    await this.goalsRepository.remove(goal);
  }

  async addMilestone(goalId: number, milestone: string, userId: number): Promise<Goal> {
    const goal = await this.findOne(goalId, userId);
    goal.addCompletedMilestone(milestone);
    return this.goalsRepository.save(goal);
  }

  async removeMilestone(goalId: number, milestone: string, userId: number): Promise<Goal> {
    const goal = await this.findOne(goalId, userId);
    const completed = goal.getCompletedMilestones();
    const updated = completed.filter(m => m !== milestone);
    goal.setCompletedMilestones(updated);
    
    // Update progress based on remaining milestones
    const totalMilestones = goal.getMilestones().length;
    if (totalMilestones > 0) {
      goal.progress = Math.round((updated.length / totalMilestones) * 100);
      if (goal.progress >= 100) {
        goal.status = GoalStatus.COMPLETED;
      } else if (goal.progress >= 80) {
        goal.status = GoalStatus.ON_TRACK;
      } else {
        goal.status = GoalStatus.BEHIND;
      }
    }
    
    return this.goalsRepository.save(goal);
  }

  async getGoalStats(userId: number): Promise<{
    total: number;
    completed: number;
    onTrack: number;
    behind: number;
  }> {
    const goals = await this.findAll(userId);
    
    return {
      total: goals.length,
      completed: goals.filter(g => g.status === GoalStatus.COMPLETED).length,
      onTrack: goals.filter(g => g.status === GoalStatus.ON_TRACK).length,
      behind: goals.filter(g => g.status === GoalStatus.BEHIND).length,
    };
  }
}
