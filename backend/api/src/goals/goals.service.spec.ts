import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { Goal } from './entities/goal.entity';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

describe('GoalsService', () => {
  let service: GoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: getRepositoryToken(Goal), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
