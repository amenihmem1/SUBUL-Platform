import {
  Injectable, Logger, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CommercialProfile } from './entities/commercial-profile.entity';
import { PromoCode } from '../promo-codes/entities/promo-code.entity';
import { PromoCodeRedemption } from '../promo-codes/entities/promo-code-redemption.entity';
import { User } from '../users/entities/user.entity';

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface CommercialStats {
  totalCodes: number;
  totalReferrals: number;
  successfulConversions: number;
  totalRevenueCents: number;
  totalDiscountCents: number;
  conversionRate: number;
}

export interface CreateCommercialDto {
  email: string;
  password: string;
  fullName: string;
  preferredCurrency?: string;
  notes?: string;
}

export interface UpdateCommercialDto {
  fullName?: string;
  status?: 'active' | 'inactive';
  preferredCurrency?: string;
  notes?: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface TopEntry {
  id: string;
  label: string;
  uses: number;
  revenueCents: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CommercialService {
  private readonly logger = new Logger(CommercialService.name);

  constructor(
    @InjectRepository(CommercialProfile)
    private readonly profileRepo: Repository<CommercialProfile>,
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private readonly redemptionRepo: Repository<PromoCodeRedemption>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── ADMIN: COMMERCIAL MANAGEMENT ─────────────────────────────────────────

  async create(dto: CreateCommercialDto): Promise<{ user: User; profile: CommercialProfile }> {
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    if (existingUser) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.dataSource.transaction(async manager => {
      const user = manager.getRepository(User).create({
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        role: 'commercial',
        status: 'active',
        isEmailVerified: true,
      });
      const savedUser = await manager.getRepository(User).save(user);

      const profile = manager.getRepository(CommercialProfile).create({
        userId: savedUser.id,
        preferredCurrency: dto.preferredCurrency ?? 'EUR',
        notes: dto.notes,
        status: 'active',
        totalReferrals: 0,
      });
      const savedProfile = await manager.getRepository(CommercialProfile).save(profile);

      return { user: savedUser, profile: savedProfile };
    });
  }

  async findAll(page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
    const [profiles, total] = await this.profileRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (profiles.length === 0) return { data: [], total };

    const userIds = profiles.map(p => p.userId);
    const users = await this.userRepo.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    // Aggregate referral counts and revenue in one query
    const profileIds = profiles.map(p => p.id);
    const statsRows = profileIds.length > 0
      ? await this.redemptionRepo
          .createQueryBuilder('r')
          .select('r.commercial_id AS commercial_id')
          .addSelect('COUNT(*)::int AS total_referrals')
          .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS total_revenue_cents')
          .where('r.commercial_id IN (:...ids)', { ids: profileIds })
          .groupBy('r.commercial_id')
          .getRawMany()
      : [];
    const statsMap = new Map(statsRows.map(r => [r.commercial_id, r]));

    const data = profiles.map(p => {
      const u = userMap.get(p.userId);
      const stats = statsMap.get(p.id);
      return {
        ...p,
        user: u ? { id: u.id, email: u.email, fullName: u.fullName, status: u.status } : null,
        totalReferrals: parseInt(stats?.total_referrals ?? '0'),
        totalRevenueCents: parseInt(stats?.total_revenue_cents ?? '0'),
      };
    });

    return { data, total };
  }

  async findById(id: string): Promise<CommercialProfile & { user?: { id: number; email: string; fullName?: string; status: string } }> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('Commercial not found');

    const user = await this.userRepo.findOne({ where: { id: profile.userId } });
    return {
      ...profile,
      user: user ? { id: user.id, email: user.email, fullName: user.fullName, status: user.status } : undefined,
    } as CommercialProfile & { user?: { id: number; email: string; fullName?: string; status: string } };
  }

  async findByUserId(userId: number): Promise<CommercialProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Commercial profile not found for this user');
    return profile;
  }

  async update(id: string, dto: UpdateCommercialDto): Promise<CommercialProfile> {
    const profile = await this.findById(id);

    if (dto.status !== undefined) profile.status = dto.status;
    if (dto.preferredCurrency !== undefined) profile.preferredCurrency = dto.preferredCurrency;
    if (dto.notes !== undefined) profile.notes = dto.notes;

    if (dto.fullName) {
      await this.userRepo.update(profile.userId, { fullName: dto.fullName.trim() });
    }
    if (dto.status === 'inactive') {
      await this.userRepo.update(profile.userId, { status: 'inactive' });
    }
    if (dto.status === 'active') {
      await this.userRepo.update(profile.userId, { status: 'active' });
    }

    return this.profileRepo.save(profile);
  }

  async deactivate(id: string): Promise<void> {
    const profile = await this.findById(id);
    profile.status = 'inactive';
    await this.profileRepo.save(profile);
    await this.userRepo.update(profile.userId, { status: 'inactive' });
  }

  // ─── STATS ─────────────────────────────────────────────────────────────────

  async getStats(commercialId: string): Promise<CommercialStats> {
    const profile = await this.profileRepo.findOne({ where: { id: commercialId } });
    if (!profile) throw new NotFoundException('Commercial not found');

    const [codeCount, redemptionRow] = await Promise.all([
      this.promoRepo.count({ where: { commercialId } }),

      this.redemptionRepo
        .createQueryBuilder('r')
        .select([
          'COUNT(*)::int                                        AS total_referrals',
          "SUM(CASE WHEN r.payment_status = 'paid' THEN 1 ELSE 0 END)::int AS paid_conversions",
          'COALESCE(SUM(r.final_amount_cents), 0)::int         AS total_revenue_cents',
          'COALESCE(SUM(r.discount_applied_cents), 0)::int     AS total_discount_cents',
        ])
        .where('r.commercial_id = :cid', { cid: commercialId })
        .getRawOne(),
    ]);

    const totalReferrals = parseInt(redemptionRow?.total_referrals ?? '0');
    const successfulConversions = parseInt(redemptionRow?.paid_conversions ?? '0');
    const conversionRate = totalReferrals > 0
      ? Math.round((successfulConversions / totalReferrals) * 100)
      : 0;

    return {
      totalCodes: codeCount,
      totalReferrals,
      successfulConversions,
      totalRevenueCents: parseInt(redemptionRow?.total_revenue_cents ?? '0'),
      totalDiscountCents: parseInt(redemptionRow?.total_discount_cents ?? '0'),
      conversionRate,
    };
  }

  // ─── PROMO CODES ───────────────────────────────────────────────────────────

  async getCodesForCommercial(commercialId: string): Promise<any[]> {
    const codes = await this.promoRepo.find({
      where: { commercialId },
      order: { createdAt: 'DESC' },
    });

    if (codes.length === 0) return [];

    const codeIds = codes.map(c => c.id);
    const statsRows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select([
        'r.promo_code_id                                        AS code_id',
        'COUNT(*)::int                                          AS total',
        "SUM(CASE WHEN r.payment_status='paid' THEN 1 ELSE 0 END)::int AS conversions",
        'COALESCE(SUM(r.discount_applied_cents),0)::int        AS discount_cents',
        'COALESCE(SUM(r.final_amount_cents),0)::int            AS revenue_cents',
      ])
      .where('r.promo_code_id IN (:...ids)', { ids: codeIds })
      .groupBy('r.promo_code_id')
      .getRawMany();

    const statsMap = new Map(statsRows.map(row => [row.code_id, row]));

    return codes.map(code => {
      const row = statsMap.get(code.id) || {};
      return {
        ...code,
        stats: {
          totalUses: parseInt(row?.total ?? '0'),
          conversions: parseInt(row?.conversions ?? '0'),
          discountCents: parseInt(row?.discount_cents ?? '0'),
          revenueCents: parseInt(row?.revenue_cents ?? '0'),
        },
      };
    });
  }

  // ─── REFERRALS ─────────────────────────────────────────────────────────────

  async getReferrals(
    commercialId: string,
    page = 1,
    limit = 20,
    filter?: { status?: string },
  ): Promise<{ data: any[]; total: number }> {
    let qb = this.redemptionRepo
      .createQueryBuilder('r')
      .where('r.commercial_id = :cid', { cid: commercialId })
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter?.status) {
      qb = qb.andWhere('r.payment_status = :ps', { ps: filter.status });
    }

    const [redemptions, total] = await qb.getManyAndCount();
    if (redemptions.length === 0) return { data: [], total };

    const promoIds = [...new Set(redemptions.map(r => r.promoCodeId))];
    const userIds  = [...new Set(redemptions.filter(r => r.userId).map(r => r.userId!))];

    const [promos, users] = await Promise.all([
      promoIds.length > 0 ? this.promoRepo.findByIds(promoIds) : [],
      userIds.length > 0  ? this.userRepo.findByIds(userIds)   : [],
    ]);

    const promoMap = new Map(promos.map(p => [p.id, p]));
    const userMap  = new Map(users.map(u => [u.id, u]));

    const data = redemptions.map(r => ({
      ...r,
      promoCode: promoMap.get(r.promoCodeId)?.code ?? null,
      userEmail: r.userId ? maskEmail(userMap.get(r.userId)?.email ?? '') : null,
    }));

    return { data, total };
  }

  // ─── CHART DATA ─────────────────────────────────────────────────────────────

  private truncExpr(period: string): string {
    const safe = ['day', 'month', 'year'].includes(period) ? period : 'day';
    return `DATE_TRUNC('${safe}', r.created_at)::date`;
  }

  /** Referral count over time for a specific commercial */
  async getReferralsChart(commercialId: string, period = 'day', range = 30): Promise<ChartDataPoint[]> {
    const trunc = this.truncExpr(period);
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select(`${trunc} AS date`)
      .addSelect('COUNT(*)::int AS value')
      .where('r.commercial_id = :cid', { cid: commercialId })
      .andWhere('r.created_at >= CURRENT_DATE - (:range)', { range })
      .groupBy(trunc)
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map(row => ({ date: row.date, value: parseInt(row.value) }));
  }

  /** Revenue generated over time for a specific commercial */
  async getRevenueChart(commercialId: string, period = 'day', range = 30): Promise<ChartDataPoint[]> {
    const trunc = this.truncExpr(period);
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select(`${trunc} AS date`)
      .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS value')
      .where('r.commercial_id = :cid', { cid: commercialId })
      .andWhere("r.payment_status = 'paid'")
      .andWhere('r.created_at >= CURRENT_DATE - (:range)', { range })
      .groupBy(trunc)
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map(row => ({ date: row.date, value: parseInt(row.value) }));
  }

  // ─── ADMIN OVERVIEW ────────────────────────────────────────────────────────

  async getAdminOverview() {
    const [totalCommercials, activeCommercials, refsRow] = await Promise.all([
      this.profileRepo.count(),
      this.profileRepo.count({ where: { status: 'active' } }),

      this.redemptionRepo
        .createQueryBuilder('r')
        .select([
          'COUNT(*)::int                                    AS total_referrals',
          'COALESCE(SUM(r.final_amount_cents), 0)::int     AS total_revenue_cents',
          'COALESCE(SUM(r.discount_applied_cents), 0)::int AS total_discount_cents',
        ])
        .where('r.commercial_id IS NOT NULL')
        .getRawOne(),
    ]);

    // Top 5 commercials by referral count
    const topRows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('r.commercial_id AS commercial_id')
      .addSelect('COUNT(*)::int AS total_referrals')
      .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS total_revenue_cents')
      .where('r.commercial_id IS NOT NULL')
      .groupBy('r.commercial_id')
      .orderBy('total_referrals', 'DESC')
      .limit(5)
      .getRawMany();

    const topProfileIds = topRows.map(r => r.commercial_id);
    const topProfiles = topProfileIds.length > 0 ? await this.profileRepo.findByIds(topProfileIds) : [];
    const topUserIds = topProfiles.map(p => p.userId);
    const topUsers = topUserIds.length > 0 ? await this.userRepo.findByIds(topUserIds) : [];
    const userMap = new Map(topUsers.map(u => [u.id, u]));
    const profileMap = new Map(topProfiles.map(p => [p.id, p]));

    const topCommercials = topRows.map((row, i) => {
      const profile = profileMap.get(row.commercial_id);
      const user = profile ? userMap.get(profile.userId) : undefined;
      return {
        rank: i + 1,
        id: row.commercial_id,
        fullName: user?.fullName ?? 'Unknown',
        email: user?.email ?? '',
        totalReferrals: parseInt(row.total_referrals),
        totalRevenueCents: parseInt(row.total_revenue_cents),
      };
    });

    return {
      totalCommercials,
      activeCommercials,
      totalReferrals: parseInt(refsRow?.total_referrals ?? '0'),
      totalRevenueCents: parseInt(refsRow?.total_revenue_cents ?? '0'),
      totalDiscountCents: parseInt(refsRow?.total_discount_cents ?? '0'),
      topCommercials,
    };
  }

  // ─── ADMIN CHART DATA ──────────────────────────────────────────────────────

  /** Total referrals across all commercials over time */
  async getAdminReferralsChart(period = 'day', range = 30): Promise<ChartDataPoint[]> {
    const trunc = this.truncExpr(period);
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select(`${trunc} AS date`)
      .addSelect('COUNT(*)::int AS value')
      .where('r.commercial_id IS NOT NULL')
      .andWhere('r.created_at >= CURRENT_DATE - (:range)', { range })
      .groupBy(trunc)
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map(row => ({ date: row.date, value: parseInt(row.value) }));
  }

  /** Total revenue generated via promo codes over time */
  async getAdminRevenueChart(period = 'day', range = 30): Promise<ChartDataPoint[]> {
    const trunc = this.truncExpr(period);
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select(`${trunc} AS date`)
      .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS value')
      .where('r.commercial_id IS NOT NULL')
      .andWhere("r.payment_status = 'paid'")
      .andWhere('r.created_at >= CURRENT_DATE - (:range)', { range })
      .groupBy(trunc)
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map(row => ({ date: row.date, value: parseInt(row.value) }));
  }

  /** Top promo codes by usage count */
  async getAdminTopCodes(limit = 5): Promise<TopEntry[]> {
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .leftJoin('promo_codes', 'pc', 'pc.id = r.promo_code_id')
      .select('r.promo_code_id AS id')
      .addSelect('pc.code AS label')
      .addSelect('COUNT(*)::int AS uses')
      .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS revenue_cents')
      .where('r.commercial_id IS NOT NULL')
      .groupBy('r.promo_code_id, pc.code')
      .orderBy('uses', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map(row => ({
      id: row.id,
      label: row.label ?? row.id,
      uses: parseInt(row.uses),
      revenueCents: parseInt(row.revenue_cents),
    }));
  }

  /** Top commercials by referral count */
  async getAdminTopCommercials(limit = 5): Promise<TopEntry[]> {
    const rows = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('r.commercial_id AS id')
      .addSelect('COUNT(*)::int AS uses')
      .addSelect('COALESCE(SUM(r.final_amount_cents), 0)::int AS revenue_cents')
      .where('r.commercial_id IS NOT NULL')
      .groupBy('r.commercial_id')
      .orderBy('uses', 'DESC')
      .limit(limit)
      .getRawMany();

    if (rows.length === 0) return [];

    const profileIds = rows.map(r => r.id);
    const profiles = await this.profileRepo.findByIds(profileIds);
    const userIds = profiles.map(p => p.userId);
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map(u => [u.id, u]));
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return rows.map(row => {
      const profile = profileMap.get(row.id);
      const user = profile ? userMap.get(profile.userId) : undefined;
      return {
        id: row.id,
        label: user?.fullName ?? user?.email ?? row.id,
        uses: parseInt(row.uses),
        revenueCents: parseInt(row.revenue_cents),
      };
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal  = local.length > 2  ? local.slice(0, 2)  + '***' : '***';
  const dotIdx       = domain.lastIndexOf('.');
  const domainPart   = dotIdx > 0 ? domain.slice(0, Math.min(3, dotIdx)) + '***' + domain.slice(dotIdx) : domain;
  return `${maskedLocal}@${domainPart}`;
}
