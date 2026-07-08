import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

describe('ExamsController', () => {
  let controller: ExamsController;
  const examsServiceMock = {
    getExams: jest.fn().mockResolvedValue({ upcoming: [], completed: [], streak: 0, stats: {} }),
    getStreak: jest.fn().mockResolvedValue({ streak: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [{ provide: ExamsService, useValue: examsServiceMock }],
    }).compile();

    controller = module.get<ExamsController>(ExamsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
