import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobsService } from '../jobs/jobs.service';
import { CompaniesService } from '../companies/companies.service';
import { EmployerCandidate, EmployerInterview, EmployerEmployee, EmployerCertifiedLearner } from './entities/employer.entity';

@Injectable()
export class EmployerService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly companiesService: CompaniesService,
    @InjectRepository(EmployerCandidate)
    private readonly candidateRepo: Repository<EmployerCandidate>,
    @InjectRepository(EmployerInterview)
    private readonly interviewRepo: Repository<EmployerInterview>,
    @InjectRepository(EmployerEmployee)
    private readonly employeeRepo: Repository<EmployerEmployee>,
    @InjectRepository(EmployerCertifiedLearner)
    private readonly certifiedLearnerRepo: Repository<EmployerCertifiedLearner>,
  ) {}

  async getDashboardData(userId: number) {
    const jobs = await this.jobsService.findAllByEmployer(userId);
    const company = await this.companiesService.findByOwner(userId);

    const recentCandidatures = await this.candidateRepo.find({
      where: { employerId: userId },
      order: { appliedAt: 'DESC' },
      take: 5,
      relations: ['user'],
    });

    const enrichedCandidatures = await Promise.all(
      recentCandidatures.map(async (c) => {
        let poste = '—';
        try {
          const job = await this.jobsService.findOne(String(c.jobId));
          poste = job?.title ?? '—';
        } catch {
          /* job missing or not found */
        }
        return {
          ...c,
          poste,
          date: c.appliedAt ? new Date(c.appliedAt).toLocaleDateString('fr-FR') : '—',
        };
      }),
    );

    const upcomingInterviews = await this.interviewRepo.find({
      where: { employerId: userId, status: 'scheduled' },
      order: { scheduledAt: 'ASC' },
      take: 5,
    });

    const enrichedInterviews = await Promise.all(
      upcomingInterviews.map(async (interview) => {
        let candidateName = '—';
        let poste = '—';
        try {
          const candidate = await this.candidateRepo.findOne({ where: { id: interview.candidateId } });
          candidateName = candidate?.name ?? '—';
          if (candidate?.jobId != null) {
            const job = await this.jobsService.findOne(String(candidate.jobId));
            poste = job?.title ?? '—';
          }
        } catch {
          /* candidate or job missing */
        }
        const scheduledDate = new Date(interview.scheduledAt);
        return {
          ...interview,
          name: candidateName,
          poste,
          heure: scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          date: scheduledDate.toLocaleDateString('fr-FR'),
        };
      }),
    );

    const employees = await this.employeeRepo.count({ where: { employerId: userId } });
    const certifiedLearners = await this.certifiedLearnerRepo.count({ where: { employerId: userId } });

    return {
      stats: {
        activeJobs: String(jobs.filter(j => j.status === 'published').length),
        pendingJobs: String(jobs.filter(j => j.status === 'pending').length),
        totalJobs: String(jobs.length),
        totalCandidates: String(enrichedCandidatures.length),
        upcomingInterviews: String(enrichedInterviews.length),
        totalEmployees: String(employees),
        totalCertifiedLearners: String(certifiedLearners),
      },
      recentCandidatures: enrichedCandidatures,
      upcomingInterviews: enrichedInterviews,
      company,
    };
  }

  async getEmployerJobs(userId: number, page = 1, limit = 10): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const jobs = await this.jobsService.findAllByEmployer(userId);
    const total = jobs.length;
    const startIndex = (page - 1) * limit;
    const paginatedJobs = jobs.slice(startIndex, startIndex + limit);
    return { data: paginatedJobs, total, page, limit };
  }

  async getCandidates(userId: number, status?: string, jobId?: string) {
    const queryBuilder = this.candidateRepo.createQueryBuilder('candidate')
      .where('candidate.employerId = :userId', { userId });

    if (status && status !== 'all') {
      queryBuilder.andWhere('candidate.status = :status', { status });
    }

    if (jobId) {
      queryBuilder.andWhere('candidate.jobId = :jobId', { jobId });
    }

    return queryBuilder.orderBy('candidate.appliedAt', 'DESC').getMany();
  }

  async getCandidate(userId: number, id: number) {
    const candidate = await this.candidateRepo.findOne({
      where: { id, employerId: userId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  async updateCandidateStatus(userId: number, id: number, status: string) {
    const candidate = await this.getCandidate(userId, id);
    candidate.status = status;
    return this.candidateRepo.save(candidate);
  }

  async getInterviews(userId: number) {
    return this.interviewRepo.find({
      where: { employerId: userId },
      order: { scheduledAt: 'DESC' },
    });
  }

  async getInterview(userId: number, id: number) {
    const interview = await this.interviewRepo.findOne({
      where: { id, employerId: userId },
    });
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }
    return interview;
  }

  async createInterview(userId: number, data: {
    title: string;
    candidateId?: number;
    jobId?: number;
    description?: string;
    scheduledAt: Date;
    durationMinutes?: number;
    meetingUrl?: string;
    meetingType?: string;
    location?: string;
  }) {
    const interview = this.interviewRepo.create({
      employerId: userId,
      title: data.title,
      candidateId: data.candidateId,
      jobId: data.jobId,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes || 60,
      meetingUrl: data.meetingUrl,
      meetingType: data.meetingType || 'video',
      location: data.location,
      status: 'scheduled',
    });
    return this.interviewRepo.save(interview);
  }

  async updateInterview(userId: number, id: number, data: Partial<{
    title: string;
    description: string;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl: string;
    meetingType: string;
    location: string;
    status: string;
    notes: string;
  }>) {
    const interview = await this.getInterview(userId, id);
    Object.assign(interview, data);
    if (data.scheduledAt) {
      interview.scheduledAt = new Date(data.scheduledAt);
    }
    return this.interviewRepo.save(interview);
  }

  async deleteInterview(userId: number, id: number) {
    const interview = await this.getInterview(userId, id);
    await this.interviewRepo.remove(interview);
    return { deleted: true };
  }

  async getCompany(userId: number) {
    const company = await this.companiesService.findByOwner(userId);
    if (!company) throw new NotFoundException('No company associated with this employer');
    return company;
  }

  async updateCompany(userId: number, data: Record<string, unknown>) {
    const company = await this.companiesService.findByOwner(userId);
    if (!company) throw new NotFoundException('No company associated with this employer');
    return this.companiesService.update(company.id, data as any);
  }

  async getEmployees(userId: number, page = 1, limit = 10): Promise<{ data: EmployerEmployee[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.employeeRepo.findAndCount({
      where: { employerId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async createEmployee(userId: number, data: {
    name: string;
    email: string;
    position?: string;
    department?: string;
  }) {
    const employee = this.employeeRepo.create({
      employerId: userId,
      name: data.name,
      email: data.email,
      position: data.position,
      department: data.department,
      learnerStatus: 'pending',
    });
    return this.employeeRepo.save(employee);
  }

  async updateEmployee(userId: number, id: number, data: Partial<{
    name: string;
    email: string;
    position: string;
    department: string;
    learnerStatus: string;
    coursesInProgress: number;
    coursesCompleted: number;
    certifications: number;
    progression: number;
  }>) {
    const employee = await this.getEmployee(userId, id);
    Object.assign(employee, data);
    return this.employeeRepo.save(employee);
  }

  async getEmployee(userId: number, id: number) {
    const employee = await this.employeeRepo.findOne({
      where: { id, employerId: userId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async deleteEmployee(userId: number, id: number) {
    const employee = await this.getEmployee(userId, id);
    await this.employeeRepo.remove(employee);
    return { deleted: true };
  }

  async getCertifiedLearners(
    userId: number,
    page = 1,
    limit = 10,
    domain?: string,
    level?: string
  ): Promise<{ data: EmployerCertifiedLearner[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.certifiedLearnerRepo.createQueryBuilder('learner')
      .where('learner.employerId = :userId', { userId });

    if (domain && domain !== 'Tous') {
      queryBuilder.andWhere('learner.domain = :domain', { domain });
    }

    if (level && level !== 'Tous') {
      queryBuilder.andWhere('learner.level = :level', { level });
    }

    const [data, total] = await queryBuilder
      .orderBy('learner.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async createCertifiedLearner(userId: number, data: {
    name: string;
    email: string;
    certification: string;
    domain?: string;
    score?: number;
    level?: string;
    available?: boolean;
  }) {
    const learner = this.certifiedLearnerRepo.create({
      employerId: userId,
      name: data.name,
      email: data.email,
      certification: data.certification,
      domain: data.domain,
      score: data.score || 0,
      level: data.level || 'intermediate',
      available: data.available !== undefined ? data.available : true,
      obtainedAt: new Date(),
    });
    return this.certifiedLearnerRepo.save(learner);
  }

  async updateCertifiedLearner(userId: number, id: number, data: Partial<{
    name: string;
    email: string;
    certification: string;
    domain: string;
    score: number;
    level: string;
    available: boolean;
  }>) {
    const learner = await this.getCertifiedLearner(userId, id);
    Object.assign(learner, data);
    return this.certifiedLearnerRepo.save(learner);
  }

  async getCertifiedLearner(userId: number, id: number) {
    const learner = await this.certifiedLearnerRepo.findOne({
      where: { id, employerId: userId },
    });
    if (!learner) {
      throw new NotFoundException('Certified learner not found');
    }
    return learner;
  }

  async deleteCertifiedLearner(userId: number, id: number) {
    const learner = await this.getCertifiedLearner(userId, id);
    await this.certifiedLearnerRepo.remove(learner);
    return { deleted: true };
  }
}
