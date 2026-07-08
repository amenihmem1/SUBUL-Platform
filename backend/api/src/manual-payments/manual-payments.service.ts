import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  ManualPaymentRequest,
  ManualPaymentStatus,
} from './entities/manual-payment-request.entity';
import { manualPaymentStatusGroup } from './manual-payment-status.util';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { ApproveManualPaymentDto } from './dto/approve-manual-payment.dto';
import { RejectManualPaymentDto } from './dto/reject-manual-payment.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';

const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semester: 6,
  annual: 12,
};

export type ManualPaymentAdminSort =
  | 'created_desc'
  | 'created_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'status_desc'
  | 'status_asc';

export interface ManualPaymentAdminFilterOpts {
  search?: string;
  status?: string;
  paymentMethod?: string;
  planSlug?: string;
  currency?: string;
  from?: string;
  to?: string;
}

export interface ManualPaymentAdminStatsDto {
  summary: {
    totalValidatedRevenueByCurrency: Record<string, number>;
    totalManualPayments: number;
    validatedCount: number;
    pendingCount: number;
    rejectedCount: number;
    averageValidatedAmountByCurrency: Record<string, number>;
    /** Per method, revenue only for validated rows; minor units per currency */
    validatedRevenueByMethod: {
      method: string;
      revenueByCurrency: Record<string, number>;
      validatedCount: number;
    }[];
  };
  revenueOverTime: {
    bucket: string;
    revenueCentsByCurrency: Record<string, number>;
    validatedCount: number;
  }[];
  statusDistribution: { category: string; count: number }[];
  methodDistribution: {
    method: string;
    totalCount: number;
    validatedCount: number;
    validatedRevenueByCurrency: Record<string, number>;
  }[];
  planRevenue: { planSlug: string; revenueByCurrency: Record<string, number> }[];
  planCounts: { planSlug: string; validatedCount: number }[];
  granularity: string;
  note: string;
}

type ManualPaymentResponse = ManualPaymentRequest & { proofPublicUrl: string | null };

@Injectable()
export class ManualPaymentsService {
  private readonly logger = new Logger(ManualPaymentsService.name);

  constructor(
    @InjectRepository(ManualPaymentRequest)
    private readonly repo: Repository<ManualPaymentRequest>,
    private readonly subscriptions: SubscriptionsService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Create request ──────────────────────────────────────────────────────────

  async createRequest(
    userId: number,
    dto: CreateManualPaymentDto,
  ): Promise<ManualPaymentRequest> {
    await this.subscriptions.assertCanUsePersonalSubscriptionFlow(userId);
    const { slug: planSlugResolved } = await this.subscriptions.resolveLearnerCheckoutPlanSlug(
      userId,
      dto.planSlug,
      dto.checkoutMode,
    );

    // Fetch user info for snapshot
    const [userRow] = await this.dataSource.query(
      `SELECT email, fullname FROM users WHERE id=$1`,
      [userId],
    );
    if (!userRow) throw new NotFoundException('User not found');

    // Generate unique order reference: MPR-YYYYMM-XXXXXX
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const orderId = `MPR-${ym}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const req = this.repo.create({
      userId,
      orderId,
      planSlug: planSlugResolved,
      planName: this.getPlanName(planSlugResolved),
      billingCycle: dto.billingCycle,
      amountCents: dto.amountCents,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      status: 'pending',
      userEmail: userRow.email,
      userFullName: userRow.fullname,
    });

    const saved = await this.repo.save(req);
    this.logger.log(`[ManualPayment] Created request ${saved.orderId} for userId=${userId}`);
    return saved;
  }

  // ─── Upload proof ────────────────────────────────────────────────────────────

  async uploadProof(
    requestId: string,
    userId: number,
    file: { s3Key?: string; localPath?: string; originalName: string },
  ): Promise<ManualPaymentResponse> {
    const req = await this.findByIdForUser(requestId, userId);

    if (req.status === 'approved') {
      throw new BadRequestException('Cannot upload proof for an already approved payment.');
    }

    // Persist a stable storage ref (blob key or local pseudo-key), never an absolute container path.
    const storeKey = file.s3Key ?? file.localPath ?? null;
    req.proofFileUrl = storeKey;
    req.proofFilePath = storeKey;
    req.proofFileName = file.originalName;
    req.status = 'pending_review';

    const saved = await this.repo.save(req);

    // Notify admin (fire-and-forget)
    this.notifyAdminProofUploaded(saved).catch(err =>
      this.logger.warn(`[ManualPayment] Admin notification failed: ${err?.message}`),
    );

    this.logger.log(`[ManualPayment] Proof uploaded for ${req.orderId}`);
    return this.withProofPublicUrl(saved);
  }

  // ─── User: get my requests ───────────────────────────────────────────────────

  async getMyRequests(userId: number): Promise<ManualPaymentResponse[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.withProofPublicUrl(row));
  }

  async getMyRequestById(requestId: string, userId: number): Promise<ManualPaymentResponse> {
    const row = await this.findByIdForUser(requestId, userId);
    return this.withProofPublicUrl(row);
  }

  // ─── Admin: list + search + filter ──────────────────────────────────────────

  private parseDateRange(opts: ManualPaymentAdminFilterOpts): { from?: Date; to?: Date } {
    let from: Date | undefined;
    let to: Date | undefined;
    if (opts.from) {
      const d = new Date(opts.from);
      if (!Number.isNaN(d.getTime())) from = d;
    }
    if (opts.to) {
      const d = new Date(opts.to);
      if (!Number.isNaN(d.getTime())) to = d;
    }
    return { from, to };
  }

  private applyAdminFilters(
    qb: SelectQueryBuilder<ManualPaymentRequest>,
    opts: ManualPaymentAdminFilterOpts,
  ): void {
    const { from, to } = this.parseDateRange(opts);
    if (opts.search?.trim()) {
      const s = `%${opts.search.trim()}%`;
      qb.andWhere(
        '(mpr.userEmail ILIKE :s OR mpr.userFullName ILIKE :s OR mpr.orderId ILIKE :s)',
        { s },
      );
    }
    if (opts.status) {
      qb.andWhere('mpr.status = :status', { status: opts.status });
    }
    if (opts.paymentMethod) {
      qb.andWhere('mpr.paymentMethod = :pm', { pm: opts.paymentMethod });
    }
    if (opts.planSlug) {
      qb.andWhere('mpr.planSlug = :planSlug', { planSlug: opts.planSlug });
    }
    if (opts.currency?.trim()) {
      qb.andWhere('UPPER(mpr.currency) = :cur', { cur: opts.currency.trim().toUpperCase() });
    }
    if (from) {
      qb.andWhere('mpr.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('mpr.createdAt <= :to', { to });
    }
  }

  private orderAdminList(qb: SelectQueryBuilder<ManualPaymentRequest>, sort?: ManualPaymentAdminSort): void {
    const key = sort ?? 'created_desc';
    const map: Record<ManualPaymentAdminSort, [string, 'ASC' | 'DESC']> = {
      created_desc: ['mpr.createdAt', 'DESC'],
      created_asc: ['mpr.createdAt', 'ASC'],
      amount_desc: ['mpr.amountCents', 'DESC'],
      amount_asc: ['mpr.amountCents', 'ASC'],
      status_desc: ['mpr.status', 'DESC'],
      status_asc: ['mpr.status', 'ASC'],
    };
    const [col, dir] = map[key] ?? map.created_desc;
    qb.orderBy(col, dir);
  }

  async adminList(options: ManualPaymentAdminFilterOpts & {
    page?: number;
    limit?: number;
    sort?: ManualPaymentAdminSort;
  }): Promise<{ data: ManualPaymentResponse[]; total: number }> {
    const page  = Math.max(1, options.page  ?? 1);
    const limit = Math.min(50, options.limit ?? 20);
    const skip  = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('mpr');
    this.applyAdminFilters(qb, options);
    this.orderAdminList(qb, options.sort);
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map((row) => this.withProofPublicUrl(row)), total };
  }

  async adminStats(
    opts: ManualPaymentAdminFilterOpts & { granularity?: 'day' | 'week' | 'month' | 'year' },
  ): Promise<ManualPaymentAdminStatsDto> {
    const unit = ['day', 'week', 'month', 'year'].includes(opts.granularity ?? '')
      ? (opts.granularity as string)
      : 'day';

    const countBase = this.repo.createQueryBuilder('mpr');
    this.applyAdminFilters(countBase, opts);
    const totalManualPayments = await countBase.getCount();

    const allForBreakdown = await this.repo
      .createQueryBuilder('mpr')
      .select('mpr.status', 'status')
      .addSelect('COUNT(*)', 'cnt');
    this.applyAdminFilters(allForBreakdown, opts);
    const statusRows = await allForBreakdown.groupBy('mpr.status').getRawMany<{ status: string; cnt: string }>();

    let validatedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    for (const r of statusRows) {
      const c = parseInt(r.cnt, 10) || 0;
      const g = manualPaymentStatusGroup(r.status);
      if (g === 'validated') validatedCount += c;
      else if (g === 'rejected') rejectedCount += c;
      else pendingCount += c;
    }

    const revQb = this.repo
      .createQueryBuilder('mpr')
      .select('mpr.currency', 'currency')
      .addSelect('SUM(mpr.amountCents)', 'sumcents')
      .addSelect('COUNT(*)', 'vcount')
      .where('mpr.status = :ap', { ap: 'approved' });
    this.applyAdminFilters(revQb, opts);
    const revRows = await revQb
      .groupBy('mpr.currency')
      .getRawMany<{ currency: string; sumcents: string | null; vcount: string }>();

    const totalValidatedRevenueByCurrency: Record<string, number> = {};
    const averageValidatedAmountByCurrency: Record<string, number> = {};
    for (const r of revRows) {
      const cur = (r.currency ?? 'TND').toUpperCase();
      const sum = parseInt(String(r.sumcents ?? '0'), 10) || 0;
      const n = parseInt(r.vcount, 10) || 0;
      totalValidatedRevenueByCurrency[cur] = sum;
      averageValidatedAmountByCurrency[cur] = n > 0 ? Math.round(sum / n) : 0;
    }

    const methodQb = this.repo
      .createQueryBuilder('mpr')
      .select('mpr.paymentMethod', 'method')
      .addSelect('COUNT(*)', 'totalcount')
      .addSelect(
        'SUM(CASE WHEN mpr.status = :ap THEN 1 ELSE 0 END)',
        'validatedcount',
      )
      .addSelect(
        'SUM(CASE WHEN mpr.status = :ap THEN mpr.amountCents ELSE 0 END)',
        'revsum',
      )
      .setParameter('ap', 'approved');
    this.applyAdminFilters(methodQb, opts);
    const methodRows = await methodQb.groupBy('mpr.paymentMethod').getRawMany<{
      method: string;
      totalcount: string;
      validatedcount: string;
      revsum: string | null;
    }>();

    const methodCurrencyQb = this.repo
      .createQueryBuilder('mpr')
      .select('mpr.paymentMethod', 'method')
      .addSelect('mpr.currency', 'currency')
      .addSelect(
        'SUM(CASE WHEN mpr.status = :ap THEN mpr.amountCents ELSE 0 END)',
        'rev',
      )
      .setParameter('ap', 'approved');
    this.applyAdminFilters(methodCurrencyQb, opts);
    const methodCurRows = await methodCurrencyQb
      .groupBy('mpr.paymentMethod')
      .addGroupBy('mpr.currency')
      .getRawMany<{ method: string; currency: string; rev: string | null }>();

    const methodRevMap = new Map<string, Record<string, number>>();
    for (const row of methodCurRows) {
      const rev = parseInt(String(row.rev ?? '0'), 10) || 0;
      if (rev === 0) continue;
      const cur = (row.currency ?? 'TND').toUpperCase();
      const m = row.method ?? 'unknown';
      if (!methodRevMap.has(m)) methodRevMap.set(m, {});
      methodRevMap.get(m)![cur] = (methodRevMap.get(m)![cur] ?? 0) + rev;
    }

    const validatedRevenueByMethod = methodRows.map((r) => {
      const method = r.method ?? 'unknown';
      const validatedCountM = parseInt(String(r.validatedcount ?? '0'), 10) || 0;
      return {
        method,
        revenueByCurrency: { ...(methodRevMap.get(method) ?? {}) },
        validatedCount: validatedCountM,
      };
    });

    const methodDistribution = methodRows.map((r) => {
      const method = r.method ?? 'unknown';
      const totalCount = parseInt(String(r.totalcount ?? '0'), 10) || 0;
      const validatedCountM = parseInt(String(r.validatedcount ?? '0'), 10) || 0;
      return {
        method,
        totalCount,
        validatedCount: validatedCountM,
        validatedRevenueByCurrency: { ...(methodRevMap.get(method) ?? {}) },
      };
    });

    const dist: { category: string; count: number }[] =
      totalManualPayments === 0
        ? []
        : [
            { category: 'pending', count: pendingCount },
            { category: 'validated', count: validatedCount },
            { category: 'rejected', count: rejectedCount },
          ].filter((d) => d.count > 0);

    const planRevQb = this.repo
      .createQueryBuilder('mpr')
      .select('mpr.planSlug', 'planSlug')
      .addSelect('mpr.currency', 'currency')
      .addSelect(
        'SUM(CASE WHEN mpr.status = :ap THEN mpr.amountCents ELSE 0 END)',
        'rev',
      )
      .setParameter('ap', 'approved');
    this.applyAdminFilters(planRevQb, opts);
    const planRevRows = await planRevQb
      .groupBy('mpr.planSlug')
      .addGroupBy('mpr.currency')
      .getRawMany<{ planSlug: string; currency: string; rev: string | null }>();

    const planAgg = new Map<string, Record<string, number>>();
    for (const row of planRevRows) {
      const rev = parseInt(String(row.rev ?? '0'), 10) || 0;
      if (rev === 0) continue;
      const slug = row.planSlug ?? 'unknown';
      const cur = (row.currency ?? 'TND').toUpperCase();
      if (!planAgg.has(slug)) planAgg.set(slug, {});
      planAgg.get(slug)![cur] = (planAgg.get(slug)![cur] ?? 0) + rev;
    }
    const planRevenue = [...planAgg.entries()].map(([planSlug, revenueByCurrency]) => ({
      planSlug,
      revenueByCurrency,
    }));

    const planCountQb = this.repo
      .createQueryBuilder('mpr')
      .select('mpr.planSlug', 'planSlug')
      .addSelect('COUNT(*)', 'cnt')
      .where('mpr.status = :ap', { ap: 'approved' });
    this.applyAdminFilters(planCountQb, opts);
    const planCountRows = await planCountQb.groupBy('mpr.planSlug').getRawMany<{ planSlug: string; cnt: string }>();
    const planCounts = planCountRows.map((r) => ({
      planSlug: r.planSlug ?? 'unknown',
      validatedCount: parseInt(r.cnt, 10) || 0,
    }));

    const bucketQb = this.repo
      .createQueryBuilder('mpr')
      .select(`date_trunc('${unit}', mpr.createdAt)`, 'bucket')
      .addSelect('mpr.currency', 'currency')
      .addSelect(
        'SUM(CASE WHEN mpr.status = :ap THEN mpr.amountCents ELSE 0 END)',
        'rev',
      )
      .setParameter('ap', 'approved');
    this.applyAdminFilters(bucketQb, opts);
    const bucketRows = await bucketQb
      .groupBy('bucket')
      .addGroupBy('mpr.currency')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date; currency: string; rev: string | null }>();

    const bucketValidatedQb = this.repo
      .createQueryBuilder('mpr')
      .select(`date_trunc('${unit}', mpr.createdAt)`, 'bucket')
      .addSelect('COUNT(*)', 'cnt')
      .where('mpr.status = :ap', { ap: 'approved' });
    this.applyAdminFilters(bucketValidatedQb, opts);
    const bucketValRows = await bucketValidatedQb
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date; cnt: string }>();
    const validatedPerBucket = new Map<string, number>();
    for (const r of bucketValRows) {
      validatedPerBucket.set(new Date(r.bucket).toISOString(), parseInt(r.cnt, 10) || 0);
    }

    const bucketMap = new Map<string, { revenueCentsByCurrency: Record<string, number>; validatedCount: number }>();
    for (const r of bucketRows) {
      const rev = parseInt(String(r.rev ?? '0'), 10) || 0;
      const iso = new Date(r.bucket).toISOString();
      if (!bucketMap.has(iso)) {
        bucketMap.set(iso, { revenueCentsByCurrency: {}, validatedCount: validatedPerBucket.get(iso) ?? 0 });
      }
      const cur = (r.currency ?? 'TND').toUpperCase();
      if (rev > 0) {
        const e = bucketMap.get(iso)!;
        e.revenueCentsByCurrency[cur] = (e.revenueCentsByCurrency[cur] ?? 0) + rev;
      }
    }
    for (const [iso, vc] of validatedPerBucket) {
      if (!bucketMap.has(iso)) {
        bucketMap.set(iso, { revenueCentsByCurrency: {}, validatedCount: vc });
      } else {
        bucketMap.get(iso)!.validatedCount = vc;
      }
    }

    const revenueOverTime = [...bucketMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, v]) => ({
        bucket,
        revenueCentsByCurrency: v.revenueCentsByCurrency,
        validatedCount: v.validatedCount,
      }));

    return {
      summary: {
        totalValidatedRevenueByCurrency,
        totalManualPayments,
        validatedCount,
        pendingCount,
        rejectedCount,
        averageValidatedAmountByCurrency,
        validatedRevenueByMethod,
      },
      revenueOverTime,
      statusDistribution: dist,
      methodDistribution,
      planRevenue,
      planCounts,
      granularity: unit,
      note:
        'Revenus validés uniquement (statut approuvé). Montants en unités mineures par devise (centimes ou millimes) — ne pas additionner entre devises.',
    };
  }

  async adminGetById(requestId: string): Promise<ManualPaymentResponse> {
    const req = await this.repo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Manual payment request not found');
    return this.withProofPublicUrl(req);
  }

  // ─── Admin: approve ──────────────────────────────────────────────────────────

  async adminApprove(
    requestId: string,
    adminId: number,
    dto: ApproveManualPaymentDto,
  ): Promise<ManualPaymentResponse> {
    const req = await this.getRawById(requestId);

    if (req.status === 'approved') {
      throw new ConflictException('Payment request already approved.');
    }

    const durationMonths = dto.durationMonths ?? CYCLE_MONTHS[req.billingCycle] ?? 1;

    // Activate subscription
    const plan = await this.subscriptions.ensurePlan(req.planSlug);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + durationMonths);

    const sub = await this.subscriptions.activatePaidSubscription(req.userId, plan.id, {
      start: now,
      end,
    });

    // Stamp payment info onto the subscription
    await this.dataSource.query(
      `UPDATE user_subscriptions SET payment_provider=$1, currency=$2, amount_paid_cents=$3 WHERE id=$4`,
      ['manual', req.currency, req.amountCents, sub.id],
    );

    // Update request
    req.status = 'approved';
    req.approvedBy = adminId;
    req.approvedAt = new Date();
    req.selectedDurationMonths = durationMonths;
    req.activatedSubscriptionId = sub.id;
    if (dto.adminNotes) req.adminNotes = dto.adminNotes;

    const saved = await this.repo.save(req);

    // Notify user (fire-and-forget)
    this.notifyUserApproved(saved, durationMonths).catch(err =>
      this.logger.warn(`[ManualPayment] User approval email failed: ${err?.message}`),
    );

    this.logger.log(`[ManualPayment] Approved ${req.orderId} by adminId=${adminId}, subId=${sub.id}`);
    return this.withProofPublicUrl(saved);
  }

  // ─── Admin: reject ───────────────────────────────────────────────────────────

  async adminReject(
    requestId: string,
    adminId: number,
    dto: RejectManualPaymentDto,
  ): Promise<ManualPaymentResponse> {
    const req = await this.getRawById(requestId);

    if (req.status === 'approved') {
      throw new ConflictException('Cannot reject an already approved payment.');
    }

    req.status = 'rejected';
    req.approvedBy = adminId;
    req.approvedAt = new Date();
    if (dto.adminNotes) req.adminNotes = dto.adminNotes;

    const saved = await this.repo.save(req);

    // Notify user (fire-and-forget)
    this.notifyUserRejected(saved).catch(err =>
      this.logger.warn(`[ManualPayment] User rejection email failed: ${err?.message}`),
    );

    this.logger.log(`[ManualPayment] Rejected ${req.orderId} by adminId=${adminId}`);
    return this.withProofPublicUrl(saved);
  }

  // ─── Admin: request new proof ────────────────────────────────────────────────

  async adminRequestNewProof(
    requestId: string,
    adminId: number,
    notes?: string,
  ): Promise<ManualPaymentResponse> {
    const req = await this.getRawById(requestId);

    req.status = 'pending';
    req.approvedBy = adminId;
    if (notes) req.adminNotes = notes;

    const saved = await this.repo.save(req);
    return this.withProofPublicUrl(saved);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findByIdForUser(requestId: string, userId: number): Promise<ManualPaymentRequest> {
    const req = await this.repo.findOne({ where: { id: requestId, userId } });
    if (!req) throw new NotFoundException('Payment request not found');
    return req;
  }

  private async getRawById(requestId: string): Promise<ManualPaymentRequest> {
    const req = await this.repo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Manual payment request not found');
    return req;
  }

  private extractProofFilename(ref?: string | null): string | null {
    if (!ref) return null;
    const raw = String(ref).trim();
    if (!raw) return null;

    let parsed = raw;
    try {
      if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        parsed = url.pathname;
      }
    } catch {
      parsed = raw;
    }

    const withoutQuery = parsed.split('?')[0].split('#')[0];
    const normalized = withoutQuery.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const candidate = segments[segments.length - 1];
    if (!candidate || candidate === 'manual-proofs') return null;
    return decodeURIComponent(candidate);
  }

  private withProofPublicUrl(row: ManualPaymentRequest): ManualPaymentResponse {
    const filename = this.extractProofFilename(row.proofFilePath ?? row.proofFileUrl);
    const proofPublicUrl = filename ? `/api/admin/manual-payments/proof/${filename}` : null;
    return {
      ...row,
      proofFileUrl: proofPublicUrl,
      proofPublicUrl,
    };
  }

  private getPlanName(slug: string): string {
    const names: Record<string, string> = {
      standard:   'Plan Standard',
      university: 'Plan Université',
      enterprise: 'Plan Entreprise',
    };
    return names[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  // ─── Mail helpers ─────────────────────────────────────────────────────────────

  private async notifyAdminProofUploaded(req: ManualPaymentRequest): Promise<void> {
    await this.mailService.sendManualPaymentProofUploaded(req);
  }

  private async notifyUserApproved(req: ManualPaymentRequest, months: number): Promise<void> {
    if (!req.userEmail) return;
    await this.mailService.sendManualPaymentApproved(req, months);
  }

  private async notifyUserRejected(req: ManualPaymentRequest): Promise<void> {
    if (!req.userEmail) return;
    await this.mailService.sendManualPaymentRejected(req);
  }
}
