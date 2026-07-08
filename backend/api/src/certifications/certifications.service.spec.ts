import { CertificationsService } from './certifications.service';

describe('CertificationsService regression', () => {
  const certificationRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
  };
  const courseRepository = {
    findOneBy: jest.fn(),
  };
  const progressRepository = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(),
    find: jest.fn(),
  };
  const issuedCertificateRepository = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(),
    find: jest.fn(),
  };

  let service: CertificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CertificationsService(
      certificationRepository as any,
      courseRepository as any,
      progressRepository as any,
      issuedCertificateRepository as any,
    );
  });

  it('enrolls learner in first linked course and increments students', async () => {
    const cert = { id: 1, title: 'AZ-900', students: 0, courses: [{ id: 101 }] };
    certificationRepository.findOne.mockResolvedValue(cert as any);
    progressRepository.findOne.mockResolvedValue(null);
    progressRepository.create.mockReturnValue({
      id: 1,
      userId: 7,
      courseId: 101,
      toDict: () => ({ id: 1, userId: 7, courseId: 101 }),
    });
    progressRepository.save.mockResolvedValue({
      id: 1,
      userId: 7,
      courseId: 101,
      toDict: () => ({ id: 1, userId: 7, courseId: 101 }),
    });
    certificationRepository.save.mockResolvedValue({ ...cert, students: 1 });

    const result = await service.enrollUserInCertification(7, 1);

    expect(result.enrolled).toBe(true);
    expect(progressRepository.create).toHaveBeenCalled();
    expect(certificationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ students: 1 }),
    );
  });

  it('returns enrolled=false when user has no progress for certification', async () => {
    const cert = { id: 1, title: 'AZ-900', courses: [{ id: 101 }] };
    certificationRepository.findOne.mockResolvedValue(cert as any);
    progressRepository.findOne.mockResolvedValue(null);

    const result = await service.getEnrollmentStatus(7, 1);

    expect(result).toEqual({ enrolled: false });
  });

  it('aggregates status across multiple linked courses of same certification', async () => {
    progressRepository.find.mockResolvedValue([
      {
        status: 'in_progress',
        overallProgress: 45,
        completedAt: null,
        courseId: 101,
        course: { id: 101, courseId: 'AZ-900-A', title: 'Course A', certification: { id: 7, title: 'AZ-900', provider: 'MS', updatedAt: new Date() } },
      },
      {
        status: 'completed',
        overallProgress: 100,
        completedAt: new Date('2026-01-01'),
        courseId: 102,
        course: { id: 102, courseId: 'AZ-900-B', title: 'Course B', certification: { id: 7, title: 'AZ-900', provider: 'MS', updatedAt: new Date() } },
      },
    ]);
    issuedCertificateRepository.findOne.mockResolvedValue({
      issuedAt: new Date('2026-01-01'),
      verificationCode: 'abc123def456',
    });

    const status = await service.getLearnerCertificationStatus(7);
    expect(status.earned).toHaveLength(1);
    expect(status.inProgress).toHaveLength(0);
    expect(status.earned[0]).toEqual(
      expect.objectContaining({
        id: 7,
        courseId: 'AZ-900-B',
      }),
    );
  });
});
