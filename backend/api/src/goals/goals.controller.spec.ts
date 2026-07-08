import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { DailyGoalsService } from './daily-goals.service';
import { WeeklyGoalsService } from './weekly-goals.service';
import { Goal } from './entities/goal.entity';
import { DailyGoal } from './entities/daily-goal.entity';
import { WeeklyGoal } from './entities/weekly-goal.entity';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

describe('GoalsController', () => {
  let controller: GoalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        GoalsService,
        DailyGoalsService,
        WeeklyGoalsService,
        { provide: getRepositoryToken(Goal), useValue: mockRepo },
        { provide: getRepositoryToken(DailyGoal), useValue: mockRepo },
        { provide: getRepositoryToken(WeeklyGoal), useValue: mockRepo },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GoalsController>(GoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
