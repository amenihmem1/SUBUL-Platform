import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { User } from './entities/user.entity';
import { UserRoadmap } from '../roadmap/entities/roadmap.entity';
import { QuizLevelResult } from '../quiz-results/entities/quiz-level-result.entity';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: AuthService, useValue: {} },
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: getRepositoryToken(UserRoadmap), useValue: mockRepo },
        { provide: getRepositoryToken(QuizLevelResult), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
