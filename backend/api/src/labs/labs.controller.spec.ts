import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';
import { Lab } from './entities/lab.entity';
import { LabProgress } from './entities/lab-progress.entity';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), merge: jest.fn() };

describe('LabsController', () => {
  let controller: LabsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabsController],
      providers: [
        LabsService,
        { provide: getRepositoryToken(Lab), useValue: mockRepo },
        { provide: getRepositoryToken(LabProgress), useValue: mockRepo },
      ],
    }).compile();

    controller = module.get<LabsController>(LabsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
