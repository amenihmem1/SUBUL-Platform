import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import { CourseModule as CourseModuleEntity } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { Lab } from './entities/lab.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';

const mockRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: mockRepo },
        { provide: getRepositoryToken(CourseModuleEntity), useValue: mockRepo },
        { provide: getRepositoryToken(Lesson), useValue: mockRepo },
        { provide: getRepositoryToken(Lab), useValue: mockRepo },
        { provide: getRepositoryToken(UserCourseProgress), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
