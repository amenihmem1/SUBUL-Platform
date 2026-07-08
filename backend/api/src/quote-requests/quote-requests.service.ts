import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { QuoteRequest, QuoteRequestStatus } from './entities/quote-request.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class QuoteRequestsService {
  constructor(
    @InjectRepository(QuoteRequest)
    private readonly quoteRepo: Repository<QuoteRequest>,
    private readonly mailService: MailService,
  ) {}

  private computeLeadScore(row: QuoteRequest): { leadScore: number; leadTier: 'high' | 'medium' | 'low'; slaBreached: boolean } {
    const users = Number(row.numberOfUsers || 0);
    let score = 0;

    if (users >= 300) score += 50;
    else if (users >= 100) score += 35;
    else if (users >= 30) score += 20;
    else if (users >= 10) score += 10;

    if (row.planType === 'entreprise') score += 20;
    if (String(row.email || '').toLowerCase().endsWith('.edu')) score += 10;

    const msg = String(row.message || '').toLowerCase();
    if (/(urgent|urgent|asap|rapid|this week|ce mois-ci|ce mois|deploiement)/i.test(msg)) {
      score += 15;
    }

    const createdAtMs = new Date(row.createdAt).getTime();
    const ageHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);
    const slaBreached = row.status === 'pending' && ageHours >= 24;

    const leadScore = Math.max(0, Math.min(100, score));
    const leadTier: 'high' | 'medium' | 'low' = leadScore >= 60 ? 'high' : leadScore >= 30 ? 'medium' : 'low';
    return { leadScore, leadTier, slaBreached };
  }

  private withInsights(row: QuoteRequest): QuoteRequest & { leadScore: number; leadTier: 'high' | 'medium' | 'low'; slaBreached: boolean } {
    return Object.assign(row, this.computeLeadScore(row));
  }

  async create(dto: CreateQuoteRequestDto): Promise<QuoteRequest> {
    const entity = this.quoteRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone || null,
      organization: dto.organization,
      numberOfUsers: dto.numberOfUsers,
      message: dto.message || null,
      planType: dto.planType,
      status: 'pending',
    });
    const saved = await this.quoteRepo.save(entity);
    await this.mailService.sendQuoteRequestNotification({
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      organization: saved.organization,
      numberOfUsers: saved.numberOfUsers,
      planType: saved.planType,
      message: saved.message || null,
      createdAt: saved.createdAt.toISOString(),
      requestId: saved.id,
    });
    return saved;
  }

  async findAll(params?: {
    page?: number;
    limit?: number;
    status?: QuoteRequestStatus;
  }): Promise<{ data: Array<QuoteRequest & { leadScore: number; leadTier: 'high' | 'medium' | 'low'; slaBreached: boolean }>; total: number }> {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params?.limit || 20)));

    const qb = this.quoteRepo.createQueryBuilder('q').orderBy('q.createdAt', 'DESC');
    if (params?.status) qb.andWhere('q.status = :status', { status: params.status });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: data.map((row) => this.withInsights(row)), total };
  }

  async findById(id: string): Promise<QuoteRequest & { leadScore: number; leadTier: 'high' | 'medium' | 'low'; slaBreached: boolean }> {
    const row = await this.quoteRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Quote request not found');
    return this.withInsights(row);
  }

  async updateStatus(id: string, status: QuoteRequestStatus): Promise<QuoteRequest> {
    const row = await this.findById(id);
    row.status = status;
    return this.quoteRepo.save(row);
  }

  async remove(id: string): Promise<void> {
    const result = await this.quoteRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Quote request not found');
    }
  }
}
