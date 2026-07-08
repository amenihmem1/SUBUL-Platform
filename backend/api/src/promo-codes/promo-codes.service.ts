import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
export interface PromoValidationResult {
  valid: boolean;
  promoCodeId: string;
  discountCents: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message: string;
}

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private readonly redemptionRepo: Repository<PromoCodeRedemption>,
    private readonly dataSource: DataSource,
  ) {}

  async validateCode(
    code: string,
    planSlug: string,
    currency: string,
    originalAmountCents: number,
    userId?: number,
  ): Promise<PromoValidationResult> {
    const promo = await this.promoRepo.findOne({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promo) {
      throw new BadRequestException('Promo code not found');
    }

    if (!promo.active) {
      throw new BadRequestException('This promo code is not active');
    }

    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
      throw new BadRequestException('This promo code is not yet valid');
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      throw new BadRequestException('This promo code has expired');
    }

    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('This promo code has reached its usage limit');
    }

    // Check applicable plans
    if (promo.applicablePlans) {
      const plans = JSON.parse(promo.applicablePlans) as string[];
      if (plans.length > 0 && !plans.includes(planSlug)) {
        throw new BadRequestException('This promo code is not valid for the selected plan');
      }
    }

    // Check currency scope
    if (promo.currencyScope && promo.currencyScope !== currency) {
      throw new BadRequestException(`This promo code is only valid for ${promo.currencyScope} payments`);
    }

    // Check per-user limit
    if (promo.perUserLimit != null && userId != null) {
      const userRedemptions = await this.redemptionRepo.count({
        where: { promoCodeId: promo.id, userId },
      });
      if (userRedemptions >= promo.perUserLimit) {
        throw new BadRequestException('You have already used this promo code the maximum number of times');
      }
    }

    // Compute discount
    let discountCents = 0;
    if (promo.discountType === 'percentage') {
      discountCents = Math.floor(originalAmountCents * (promo.discountValue / 100));
    } else {
      const currencyFactor = currency === 'TND' ? 1000 : 100;
      discountCents = Math.round(promo.discountValue * currencyFactor);
    }
    discountCents = Math.min(discountCents, originalAmountCents);

    return {
      valid: true,
      promoCodeId: promo.id,
      discountCents,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      message: `Promo code applied: ${promo.discountType === 'percentage' ? promo.discountValue + '% off' : `${(discountCents / 100).toFixed(2)} ${currency} off`}`,
    };
  }

  async recordRedemption(
    promoCodeId: string,
    userId: number,
    paymentTransactionId: string,
    discountAppliedCents: number,
    context?: {
      originalAmountCents?: number;
      finalAmountCents?: number;
      currency?: string;
      paymentStatus?: string;
    },
  ): Promise<void> {
    // Track which commercial to award referral after transaction
    let commercialId: string | undefined;

    await this.dataSource.transaction(async manager => {
      const promo = await manager
        .getRepository(PromoCode)
        .createQueryBuilder('promo')
        .setLock('pessimistic_write')
        .where('promo.id = :promoCodeId', { promoCodeId })
        .getOne();

      if (!promo) {
        throw new NotFoundException('Promo code not found');
      }

      const existingRedemption = await manager.getRepository(PromoCodeRedemption).findOne({
        where: { paymentTransactionId },
      });
      if (existingRedemption) {
        return;
      }

      if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
        throw new BadRequestException('This promo code has reached its usage limit');
      }

      if (promo.perUserLimit != null) {
        const userRedemptions = await manager.getRepository(PromoCodeRedemption).count({
          where: { promoCodeId, userId },
        });
        if (userRedemptions >= promo.perUserLimit) {
          throw new BadRequestException('You have already used this promo code the maximum number of times');
        }
      }

      // Track commercial for referral counting
      commercialId = promo.commercialId || undefined;

      const redemption = manager.getRepository(PromoCodeRedemption).create({
        promoCodeId,
        userId,
        paymentTransactionId,
        discountAppliedCents,
        originalAmountCents: context?.originalAmountCents,
        finalAmountCents: context?.finalAmountCents,
        currency: context?.currency,
        paymentStatus: context?.paymentStatus,
        commercialId,
        commissionPaid: false,
        earningStatus: 'validated' as const,
      });
      await manager.getRepository(PromoCodeRedemption).save(redemption);
      promo.usedCount += 1;
      await manager.getRepository(PromoCode).save(promo);
    });

    // Note: referral counting is handled via the promo_code_redemptions.commercial_id FK.
    // No points logic — usage is tracked by querying redemptions directly.
  }

  // Admin CRUD
  async findAll(page = 1, limit = 20): Promise<{ data: PromoCode[]; total: number }> {
    const [data, total] = await this.promoRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findById(id: string): Promise<PromoCode | null> {
    return this.promoRepo.findOne({ where: { id } });
  }

  async create(dto: CreatePromoCodeDto, createdBy?: number): Promise<PromoCode> {
    const existing = await this.promoRepo.findOne({
      where: { code: dto.code.toUpperCase().trim() },
    });
    if (existing) throw new ConflictException('A promo code with this value already exists');

    const promo = this.promoRepo.create({
      code: dto.code.toUpperCase().trim(),
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      applicablePlans: dto.applicablePlans ? JSON.stringify(dto.applicablePlans) : undefined,
      maxUses: dto.maxUses,
      perUserLimit: dto.perUserLimit,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      active: dto.active ?? true,
      currencyScope: dto.currencyScope,
      createdBy,
      commercialId: (dto as any).commercialId ?? undefined,
    });
    return this.promoRepo.save(promo);
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promo = await this.findById(id);
    if (!promo) throw new NotFoundException('Promo code not found');

    if (dto.code && dto.code !== promo.code) {
      const clash = await this.promoRepo.findOne({ where: { code: dto.code.toUpperCase().trim() } });
      if (clash) throw new ConflictException('A promo code with this value already exists');
      promo.code = dto.code.toUpperCase().trim();
    }

    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.discountType !== undefined) promo.discountType = dto.discountType;
    if (dto.discountValue !== undefined) promo.discountValue = dto.discountValue;
    if (dto.applicablePlans !== undefined) promo.applicablePlans = JSON.stringify(dto.applicablePlans);
    if (dto.maxUses !== undefined) promo.maxUses = dto.maxUses;
    if (dto.perUserLimit !== undefined) promo.perUserLimit = dto.perUserLimit;
    if (dto.startDate !== undefined) promo.startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    if (dto.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (dto.active !== undefined) promo.active = dto.active;
    if (dto.currencyScope !== undefined) promo.currencyScope = dto.currencyScope;
    if ((dto as any).commercialId !== undefined) promo.commercialId = (dto as any).commercialId || undefined;

    return this.promoRepo.save(promo);
  }

  async remove(id: string): Promise<void> {
    const result = await this.promoRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Promo code not found');
  }

  async getStats(id: string): Promise<{ total: number; unique_users: number }> {
    const total = await this.redemptionRepo.count({ where: { promoCodeId: id } });
    const result = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r.user_id)', 'unique_users')
      .where('r.promo_code_id = :id', { id })
      .getRawOne();
    return { total, unique_users: parseInt(result?.unique_users || '0') };
  }
}
