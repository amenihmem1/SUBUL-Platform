import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LabsService } from './labs.service';
import { Lab } from './entities/lab.entity';
import { LabProgress } from './entities/lab-progress.entity';
import { TranslationService } from '../translation/translation.service';

const mockRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
};

describe('LabsService', () => {
  let service: LabsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabsService,
        { provide: getRepositoryToken(Lab), useValue: mockRepo },
        { provide: getRepositoryToken(LabProgress), useValue: mockRepo },
        { provide: TranslationService, useValue: { translateLab: jest.fn() } },
      ],
    }).compile();

    service = module.get<LabsService>(LabsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
