import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    // NotificationsService can be injected here. If circular dep occurs, use forwardRef. 
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createJobDto: CreateJobDto, employerId: number, companyId?: string): Promise<Job> {
    const defaultData: any = {
      ...createJobDto,
      status: 'pending',
      employerId,
      companyId,
    };
    
    // Convert deadline to Date if provided
    if (createJobDto.deadline) {
      defaultData.deadline = new Date(createJobDto.deadline);
    }

    const job = this.jobRepository.create(defaultData);
    const savedJob = await this.jobRepository.save(job as any);

    // Notify Admin
    await this.notificationsService.notifyAdmin(
      'job_submitted',
      savedJob,
      'Nouvelle Offre à valider',
      `L'offre "${savedJob.title}" vient d'être soumise pour validation.`
    );

    return savedJob;
  }

  async findAll(status?: string, page = 1, limit = 10): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'published';
    }

    const [data, total] = await this.jobRepository.findAndCount({
      where,
      relations: ['company'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findAllPendingForAdmin(page = 1, limit = 10): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.jobRepository.findAndCount({
      where: { status: 'pending' },
      order: { createdAt: 'DESC' },
      relations: ['company'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /** Admin list with no status filter (all statuses) */
  async findAllForAdmin(page = 1, limit = 10): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.jobRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['company'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findAllByEmployer(employerId: number): Promise<Job[]> {
    return this.jobRepository.find({
      where: { employerId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByCompany(companyId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { companyId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id }, relations: ['company'] });
    if (!job) {
      throw new NotFoundException(`Job #${id} not found`);
    }
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, employerId: number, companyId?: string): Promise<Job> {
    const job = await this.findOne(id);

    // Verify ownership: require companyId match when present (spec: job.companyId === requestCompanyId)
    if (companyId != null && job.companyId !== companyId) {
      throw new ForbiddenException('You are not allowed to edit this job offer.');
    }
    if (job.employerId !== employerId) {
      throw new ForbiddenException('You are not allowed to edit this job offer.');
    }

    const previousStatus = job.status;
    const updateData: any = { ...updateJobDto };
    // Employer cannot set status to published or rejected; only allow transition to pending when re-submitting
    delete updateData.status;
    if (previousStatus === 'published' || previousStatus === 'rejected') {
      updateData.status = 'pending';
      updateData.previousStatus = previousStatus;
    }

    if (updateJobDto.deadline) {
      updateData.deadline = new Date(updateJobDto.deadline);
    }

    Object.assign(job, updateData);
    const savedJob = await this.jobRepository.save(job as any);

    // Notify admin if it changed back to pending
    if (savedJob.status === 'pending' && previousStatus !== 'pending') {
      await this.notificationsService.notifyAdmin(
        'job_modified',
        savedJob,
        'Offre modifiée — à re-valider',
        `L'offre "${savedJob.title}" a été modifiée et nécessite une revalidation.`
      );
    }

    return savedJob;
  }

  async updateStatusForAdmin(
    id: string, 
    status: string, 
    adminId: number, 
    adminNotes?: string, 
    rejectionReason?: string
  ): Promise<Job> {
    const job = await this.findOne(id);
    if (job.status !== 'pending') {
      throw new BadRequestException('Seules les offres en attente peuvent être acceptées ou refusées.');
    }
    if (status !== 'published' && status !== 'rejected') {
      throw new BadRequestException('Le statut doit être "published" ou "rejected".');
    }
    job.status = status;
    job.reviewedById = adminId;
    job.reviewedAt = new Date();
    
    if (adminNotes) job.adminNotes = adminNotes;
    
    if (status === 'published') {
      job.publishedAt = new Date();
    } else if (status === 'rejected') {
      if (rejectionReason) job.rejectionReason = rejectionReason;
    }

    const savedJob = await this.jobRepository.save(job);

    // Notify Employer
    if (job.employerId) {
      let title = '';
      let message = '';
      let type = '';
      
      if (status === 'published') {
        type = 'job_published';
        title = 'Votre offre a été publiée !';
        message = `Votre offre "${job.title}" a été acceptée et est maintenant visible.`;
      } else if (status === 'rejected') {
        type = 'job_rejected';
        title = 'Votre offre a été refusée';
        message = `Votre offre "${job.title}" a été refusée. ${rejectionReason ? 'Motif: ' + rejectionReason : ''}`;
      }

      if (type) {
        await this.notificationsService.notifyByEmployer(type, job.employerId, job.id, title, message);
      }
    }

    return savedJob;
  }

  async remove(id: string, employerId: number, companyId?: string): Promise<void> {
    const job = await this.findOne(id);

    // Verify ownership
    if (companyId != null && job.companyId !== companyId) {
      throw new ForbiddenException('You are not allowed to delete this job offer.');
    }
    if (job.employerId !== employerId) {
      throw new ForbiddenException('You are not allowed to delete this job offer.');
    }

    job.status = 'archived'; // Soft delete
    await this.jobRepository.save(job);
  }

  async findByMatchingCriteria(domain?: string, skills: string[] = []): Promise<Job[]> {
    const query = this.jobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where('job.status = :status', { status: 'published' });

    if (domain && domain.trim()) {
      const d = domain.trim();
      const escaped = d.replace(/[%_\\]/g, '\\$&');
      query.andWhere(
        `(LOWER(COALESCE(job.domain, '')) = LOWER(:domainExact) ` +
          `OR LOWER(COALESCE(job.domain, '')) LIKE LOWER(:domainLike) ` +
          `OR LOWER(COALESCE(job.title, '')) LIKE LOWER(:domainLike))`,
        { domainExact: d, domainLike: `%${escaped}%` },
      );
    }

    if (skills.length > 0) {
      const lowerSkills = skills.map((s) => s.toLowerCase());
      query.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(job.skills) AS skill WHERE LOWER(skill) = ANY(:skills))`,
        { skills: lowerSkills },
      );
    }

    return query.orderBy('job.createdAt', 'DESC').take(40).getMany();
  }

  /** Recent published offers — used when domain/skills match nothing (CV flow should still show opportunities). */
  async findPublishedRecent(limit = 15): Promise<Job[]> {
    return this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where('job.status = :status', { status: 'published' })
      .orderBy('job.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
