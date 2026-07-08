import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubscriptionPlan, PlanType, PlanVisibility } from './entities/subscription-plan.entity';
import { PlanBillingOption, PricingRegion, BillingCycle } from './entities/plan-billing-option.entity';
import { SubscriptionStatus, UserSubscription } from './entities/user-subscription.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { User } from '../users/entities/user.entity';
import { UniversityMembership } from '../university/entities/university-membership.entity';
import { UniversityLicense } from '../university/entities/university-license.entity';
import {
  SubscriptionAccessDto,
  AccessRoleContext,
  AccessSource,
  SubscriptionKind,
  ContentLimits,
} from './dto/subscription-access.dto';
import { MailService } from '../mail/mail.service';
import {
  PUBLIC_PLANS,
  PUBLIC_PLAN_SLUGS,
  FREE_PLAN_SLUG,
  LEGACY_FREE_PLAN_SLUG,
  PublicPlanConfig,
  PlanEntitlements,
  PublicPlanSlug,
  isPublicPlanSlug,
} from '../config/plans';
import {
  assertAdminLearnerPaidPeriod,
  assertAdminLearnerPlanSlug,
} from '../config/admin-learner-subscription';
import {
  effectivePublicPlanSlug,
  entitlementsForSubscriptionState,
  isPremiumEquivalentSlug,
} from './subscription-access.policy';

const TRIAL_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function isCommercialLikeUserRole(role?: string | null): boolean {
  if (role == null || role === '') return false;
  const r = role.trim().toLowerCase();
  return r === 'commercial' || r === 'commercant' || r === 'commerçant';
}

function toIso(d?: Date | null): string | null {
  if (!d) return null;
  try {
    return d.toISOString();
  } catch {
    return null;
  }
}

function inferBillingCycleFromPeriod(start?: Date | null, end?: Date | null): 'monthly' | 'quarterly' | 'semester' | 'annual' | null {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  const days = ms / DAY_MS;
  if (days <= 35) return 'monthly';
  if (days <= 100) return 'quarterly';
  return 'annual';
}

/** Transform a code-owned PublicPlanConfig into the DB seed shape. */
function publicPlanToBlueprint(p: PublicPlanConfig): Partial<SubscriptionPlan> {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    type: p.type,
    visibility: p.visibility,
    sortOrder: p.sortOrder,
    badgeText: p.badgeText,
    themeColor: p.themeColor,
    isActive: true,
    features: JSON.stringify({
      ...p.entitlements,
      featureLines: p.featureLines,
    }),
    billingOptions: p.billingOptions.map((opt) => ({
      region: opt.region,
      cycle: opt.cycle,
      priceCents: opt.priceCents,
      currency: opt.currency,
      discountText: opt.discountText,
      isActive: opt.isActive ?? true,
    })) as PlanBillingOption[],
  };
}

/**
 * Canonical plan definitions — upserted on every startup so the DB is always seeded.
 * Public plans (free/standard/premium) come from the single source of truth in
 * `config/plans.ts`; legacy b2b slugs are appended here.
 */
const BUILT_IN_PLANS: Array<Partial<SubscriptionPlan>> = [
  ...Object.values(PUBLIC_PLANS).map(publicPlanToBlueprint),
  {
    slug: 'university',
    name: 'Plan Université',
    description: 'Gestion de cohortes, licences, reporting, et accompagnement dédié pour établissements.',
    type: 'university',
    visibility: 'public',
    sortOrder: 4,
    themeColor: 'blue',
    isActive: true,
    features: JSON.stringify({ academic: true }),
  },
  {
    slug: 'enterprise',
    name: 'Plan Entreprise',
    description: 'Formation des équipes, talent pipeline, et tableaux de bord RH orientés performance.',
    type: 'enterprise',
    visibility: 'public',
    sortOrder: 5,
    themeColor: 'amber',
    isActive: true,
    features: JSON.stringify({ corporate: true }),
  },
];

/** Slugs whose `type`, `slug`, `visibility`, and `name` are force-synced from code on every startup. */
const CODE_OWNED_SLUGS = new Set<string>(Object.values(PUBLIC_PLANS).map((p) => p.slug));

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(PlanBillingOption)
    private readonly billingRepo: Repository<PlanBillingOption>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UniversityMembership)
    private readonly uniMemberRepo: Repository<UniversityMembership>,
    @InjectRepository(UniversityLicense)
    private readonly uniLicRepo: Repository<UniversityLicense>,
    private readonly mailService: MailService,
  ) {}

  /** True when the user has an active B2B2C student seat (admin must not assign personal learner subs). */
  async hasActiveInstitutionalStudentSeat(userId: number): Promise<boolean> {
    return (await this.findActiveInstitutionalAccess(userId)) != null;
  }

  /** Batch: userId → has active institutional seat (for admin user list). */
  async mapUserIdsToInstitutionalSeat(userIds: number[]): Promise<Record<number, boolean>> {
    const out: Record<number, boolean> = {};
    for (const id of userIds) out[id] = false;
    if (!userIds.length) return out;

    const list = await this.uniMemberRepo.find({
      where: { userId: In(userIds), role: 'student', status: 'active' },
      relations: ['university'],
    });
    const activeMemberships = list.filter((m) => m.university?.status === 'active');
    const uniqUni = [...new Set(activeMemberships.map((m) => m.universityId))];
    const validUniIds = new Set<string>();
    for (const uid of uniqUni) {
      const lic = await this.uniLicRepo.findOne({
        where: { universityId: uid, status: 'active' },
        order: { createdAt: 'DESC' },
      });
      if (lic && (!lic.validUntil || lic.validUntil.getTime() > Date.now())) {
        validUniIds.add(uid);
      }
    }
    for (const m of activeMemberships) {
      if (validUniIds.has(m.universityId)) out[m.userId] = true;
    }
    return out;
  }

  /** Learner (or any account) with an active student seat under an active university license */
  private async findActiveInstitutionalAccess(userId: number): Promise<{ universityName: string } | null> {
    const m = await this.uniMemberRepo.findOne({
      where: { userId, role: 'student', status: 'active' },
      relations: ['university'],
    });
    if (!m?.university || m.university.status !== 'active') return null;
    const lic = await this.uniLicRepo.findOne({
      where: { universityId: m.universityId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
    if (!lic) return null;
    if (lic.validUntil && lic.validUntil.getTime() < Date.now()) return null;
    return { universityName: m.university.name };
  }

  private resolveRoleContext(role?: string | null): AccessRoleContext {
    const r = String(role ?? '').trim().toLowerCase();
    if (r === 'admin') return 'admin';
    if (r === 'learner') return 'learner';
    if (isCommercialLikeUserRole(r)) return 'commercial';
    if (r === 'student') return 'university_student';
    if (r === 'university' || r === 'university_owner') return 'university_staff';
    return 'other';
  }

  private toContentLimits(entitlements: PlanEntitlements): ContentLimits {
    return {
      maxCourses: entitlements.maxCourses,
      maxLabs: entitlements.maxLabs,
      maxCertifications: entitlements.maxCertifications,
    };
  }

  private canUsePersonalSubscriptionFlow(roleContext: AccessRoleContext, accessSource: AccessSource): boolean {
    return roleContext === 'learner' && accessSource !== 'institutional';
  }

  private enrichAccessDto(dto: SubscriptionAccessDto, roleContext: AccessRoleContext): SubscriptionAccessDto {
    const accessSource: AccessSource = dto.kind === 'institutional_active'
      ? 'institutional'
      : dto.kind === 'free'
        ? 'none'
        : 'personal';

    const tier = effectivePublicPlanSlug(dto.kind, dto.planSlug);
    const entitlements = entitlementsForSubscriptionState(dto.kind, dto.planSlug);

    dto.accessSource = accessSource;
    dto.roleContext = roleContext;
    dto.effectivePlanSlug = tier;
    dto.entitlements = entitlements;
    dto.contentLimits = this.toContentLimits(entitlements);
    dto.premiumEquivalent = isPremiumEquivalentSlug(tier);
    dto.canUsePersonalSubscriptionFlow = this.canUsePersonalSubscriptionFlow(roleContext, accessSource);
    return dto;
  }

  /**
   * Roles that never use `/me/status` as a personal-learner subscription subject
   * (no Gratuit/Standard/Premium "current plan" for pricing; no trial auto-start side effects).
   * `university_student` is excluded so `evaluateAccess` can still return `institutional_active`.
   */
  private skipPersonalLearnerSubscriptionEvaluation(roleContext: AccessRoleContext): boolean {
    return (
      roleContext === 'admin' ||
      roleContext === 'commercial' ||
      roleContext === 'university_staff' ||
      roleContext === 'other'
    );
  }

  /** Neutral profile for staff / admin — not a learner pricing tier. */
  private neutralNonLearnerSubscriptionAccess(): SubscriptionAccessDto {
    return this.baseDto({
      hasAccess: true,
      status: 'active',
      kind: 'cancelled',
      planSlug: null,
      planName: null,
      billingCycle: null,
      paidPeriodProgress: 0,
    });
  }

  async resolveAccessProfile(userId: number): Promise<SubscriptionAccessDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const roleContext = this.resolveRoleContext(user?.role);

    if (this.skipPersonalLearnerSubscriptionEvaluation(roleContext)) {
      return this.enrichAccessDto(this.neutralNonLearnerSubscriptionAccess(), roleContext);
    }

    const access = await this.evaluateAccess(userId);
    return this.enrichAccessDto(access, roleContext);
  }

  async assertCanUsePersonalSubscriptionFlow(userId: number): Promise<void> {
    const profile = await this.resolveAccessProfile(userId);
    if (!profile.canUsePersonalSubscriptionFlow) {
      throw new ForbiddenException(
        'This account is managed outside personal learner subscriptions. Use the appropriate organizational workspace.',
      );
    }
  }

  /**
   * Resolves the effective Standard/Premium slug for learner checkout or manual payment.
   * - Blocks Premium → Standard (downgrade) from self-serve checkout.
   * - Prevents accidental same-plan purchase for Standard (defaults to Premium upgrade unless `checkoutMode=renew`).
   * - Prevents accidental same-plan purchase for Premium (requires `checkoutMode=renew`).
   */
  async resolveLearnerCheckoutPlanSlug(
    userId: number,
    requestedRaw: string | null | undefined,
    checkoutMode?: 'renew' | 'purchase' | 'upgrade',
  ): Promise<{ slug: 'standard' | 'premium'; coercedFromStandardRenewal?: boolean }> {
    const requested = (requestedRaw?.trim() || 'standard').toLowerCase();
    if (requested !== 'standard' && requested !== 'premium') {
      throw new BadRequestException('Invalid plan selection for checkout.');
    }

    const access = await this.resolveAccessProfile(userId);

    if (!access.canUsePersonalSubscriptionFlow) {
      return { slug: requested as 'standard' | 'premium' };
    }

    if (access.kind !== 'paid_active') {
      return { slug: requested as 'standard' | 'premium' };
    }

    const current = (access.planSlug || '').toLowerCase();
    if (current !== 'standard' && current !== 'premium') {
      return { slug: requested as 'standard' | 'premium' };
    }

    if (current === 'premium' && requested === 'standard') {
      throw new BadRequestException(
        'You cannot switch to Standard from checkout. Contact support if you need to change plans.',
      );
    }

    const explicitRenew = checkoutMode === 'renew';

    if (requested === current) {
      if (explicitRenew) {
        return { slug: requested as 'standard' | 'premium' };
      }
      if (current === 'standard') {
        this.logger.log(
          `[CheckoutPlan] userId=${userId} has active Standard and requested Standard without renew — coercing checkout to Premium (upgrade)`,
        );
        return { slug: 'premium', coercedFromStandardRenewal: true };
      }
      throw new BadRequestException(
        'You already have an active Premium subscription. To renew the same plan, use renewal checkout (renew mode) or your billing options.',
      );
    }

    return { slug: requested as 'standard' | 'premium' };
  }

  hasPremiumEquivalentLearningAccess(access: SubscriptionAccessDto): boolean {
    return access.premiumEquivalent === true;
  }

  /**
   * Certifications are a Premium-tier feature: require premium-equivalent learning access
   * (personal Premium or B2B2C institutional) plus non-zero certification entitlement from the plan config.
   */
  hasCertificationAccess(access: SubscriptionAccessDto): boolean {
    if (!this.hasPremiumEquivalentLearningAccess(access)) return false;
    return access.entitlements.maxCertifications === -1 || access.entitlements.maxCertifications > 0;
  }

  maxJobOpportunities(access: SubscriptionAccessDto): number {
    return access.entitlements.maxJobOpportunities;
  }

  /** Admin learner-subscription flows must not target commercial / commerçant accounts. */
  private async assertLearnerSubscriptionAdminAllowed(userId: number): Promise<void> {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    const r = String(u.role ?? '').trim().toLowerCase();
    if (r === 'admin') {
      throw new ForbiddenException(
        'Admin accounts do not use learner personal subscriptions; this action is not allowed.',
      );
    }
    if (r === 'university' || r === 'university_owner') {
      throw new ForbiddenException(
        'University (campus) accounts do not use learner personal subscriptions; manage access via university licensing.',
      );
    }
    if (isCommercialLikeUserRole(u.role)) {
      throw new ForbiddenException(
        'Commercial accounts cannot have learner subscriptions assigned or updated via admin.',
      );
    }
    if (await this.findActiveInstitutionalAccess(userId)) {
      throw new ForbiddenException(
        'University students receive access through their institution; individual learner subscriptions cannot be managed here.',
      );
    }
  }

  /** Upsert built-in plans.
   *
   * Normal restart  → only creates missing billing options; admin DB edits are preserved.
   * FORCE_PLAN_SEED=true → fully overwrites all billing options from BUILT_IN_PLANS.
   *                        Set this in production .env on every deploy so code prices are authoritative.
   */
  async onModuleInit(): Promise<void> {
    const forceSeed = process.env.FORCE_PLAN_SEED === 'true';
    if (forceSeed) {
      this.logger.log('[Plans] FORCE_PLAN_SEED=true — billing options will be overwritten from code.');
    }

    for (const blueprint of BUILT_IN_PLANS) {
      try {
        let existing = await this.planRepo.findOne({
          where: { slug: blueprint.slug! },
          relations: ['billingOptions'],
        });

        if (!existing) {
          const created = this.planRepo.create(blueprint);
          await this.planRepo.save(created);
          this.logger.log(`[Plans] Seeded new plan: ${blueprint.slug}`);
          continue;
        }

        const { billingOptions, ...fieldsToUpdate } = blueprint;
        if (CODE_OWNED_SLUGS.has(blueprint.slug!)) {
          // Public plans: enforce type/slug/visibility/name from code on every startup
          // so admin edits can't desync DB from code (root cause of Standard→Gratuit bug).
          Object.assign(existing, {
            ...fieldsToUpdate,
            // Preserve admin-editable fields: description + features JSON
            description: existing.description ?? fieldsToUpdate.description,
            features: existing.features ?? fieldsToUpdate.features,
          });
        } else {
          // Legacy plans: light-touch sync (don't overwrite admin-curated fields).
          Object.assign(existing, fieldsToUpdate);
        }
        existing = await this.planRepo.save(existing);
        this.logger.log(`[Plans] Synced plan metadata: ${blueprint.slug}`);

        if (!billingOptions || billingOptions.length === 0) continue;

        if (forceSeed) {
          // Full overwrite: delete all existing options then re-insert from code
          if (existing.billingOptions?.length) {
            await this.billingRepo.remove(existing.billingOptions);
          }
          for (const opt of billingOptions) {
            await this.billingRepo.save(this.billingRepo.create({ ...opt, plan: existing }));
          }
          this.logger.log(`[Plans] Force-reseeded ${billingOptions.length} billing options for: ${blueprint.slug}`);
        } else {
          // Normal restart: only create options that don't exist yet
          for (const opt of billingOptions) {
            const exists = existing.billingOptions?.find(
              (o) => o.cycle === opt.cycle && o.region === opt.region,
            );
            if (!exists) {
              await this.billingRepo.save(this.billingRepo.create({ ...opt, plan: existing }));
              this.logger.log(`[Plans] Added missing billing option ${opt.region}/${opt.cycle} for: ${blueprint.slug}`);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`[Plans] Could not upsert plan "${blueprint.slug}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /**
   * Resolve a plan by slug. Strictly rejects unknown slugs to prevent the
   * historical Standard→Gratuit bug where a typo or empty `tx.planSlug` silently
   * created a hidden `type='standard'` shell plan and wrong entitlement followed.
   */
  async ensurePlan(slug: string): Promise<SubscriptionPlan> {
    if (!slug || typeof slug !== 'string') {
      this.logger.error(`[ensurePlan] CRITICAL: invalid plan slug "${slug}"`);
      throw new NotFoundException('Plan slug is required.');
    }

    const existing = await this.planRepo.findOne({ where: { slug }, relations: ['billingOptions'] });
    if (existing) return existing;

    const blueprint = BUILT_IN_PLANS.find((p) => p.slug === slug);
    if (blueprint) {
      const created = this.planRepo.create(blueprint);
      return this.planRepo.save(created);
    }

    this.logger.error(`[ensurePlan] CRITICAL: unknown plan slug "${slug}" — refusing silent fallback.`);
    throw new NotFoundException(`Unknown plan slug: ${slug}`);
  }

  async findAllPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      relations: ['billingOptions'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });
  }

  /** Free / Standard / Premium only — for admin learner personal subscription UI. */
  async findLearnerPersonalPlansForAdmin(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: { slug: In([...PUBLIC_PLAN_SLUGS]), isActive: true },
      relations: ['billingOptions'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findPlanById(id: string): Promise<SubscriptionPlan | null> {
    return this.planRepo.findOne({ where: { id }, relations: ['billingOptions'] });
  }

  async findPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    return this.planRepo.findOne({ where: { slug }, relations: ['billingOptions'] });
  }

  async createPlan(data: Partial<SubscriptionPlan> & { billingOptions?: Partial<PlanBillingOption>[] }): Promise<SubscriptionPlan> {
    const slugNorm = (data.slug ?? '').trim().toLowerCase();
    if (isPublicPlanSlug(slugNorm)) {
      throw new ForbiddenException('This plan slug is owned by application configuration and cannot be created via API.');
    }
    const existing = await this.findPlanBySlug(data.slug!);
    if (existing) throw new ConflictException('Plan slug already exists');
    
    // Extract billing options
    const billingOpts = data.billingOptions?.map(o => this.billingRepo.create(o)) || [];
    
    const p = this.planRepo.create({
      name: data.name!,
      slug: data.slug!,
      description: data.description,
      type: data.type ?? 'standard',
      visibility: data.visibility ?? 'public',
      sortOrder: data.sortOrder ?? 0,
      badgeText: data.badgeText,
      themeColor: data.themeColor,
      features: typeof data.features === 'string' ? data.features : JSON.stringify(data.features || {}),
      isActive: data.isActive ?? true,
      billingOptions: billingOpts,
    });
    return this.planRepo.save(p);
  }

  async updatePlan(id: string, data: Partial<SubscriptionPlan> & { billingOptions?: Partial<PlanBillingOption>[] }): Promise<SubscriptionPlan> {
    const p = await this.findPlanById(id);
    if (!p) throw new NotFoundException('Plan not found');
    if (isPublicPlanSlug(p.slug.trim().toLowerCase())) {
      throw new ForbiddenException('This plan is owned by application configuration and cannot be modified via API.');
    }
    if (data.slug && isPublicPlanSlug(String(data.slug).trim().toLowerCase())) {
      throw new ForbiddenException('Cannot assign a reserved public plan slug.');
    }
    if (data.slug && data.slug !== p.slug) {
      const clash = await this.findPlanBySlug(data.slug);
      if (clash) throw new ConflictException('Plan slug already exists');
    }
    
    // If billingOptions array is provided, replace the old ones
    if (data.billingOptions) {
      // First delete existing billing options. (Cascade delete might not work here since we just replace the array in typeorm)
      await this.billingRepo.delete({ planId: p.id });
      p.billingOptions = data.billingOptions.map(o => this.billingRepo.create({ ...o }));
    }

    Object.assign(p, {
      name: data.name ?? p.name,
      slug: data.slug ?? p.slug,
      description: data.description ?? p.description,
      type: data.type ?? p.type,
      visibility: data.visibility ?? p.visibility,
      sortOrder: data.sortOrder ?? p.sortOrder,
      badgeText: data.badgeText !== undefined ? data.badgeText : p.badgeText,
      themeColor: data.themeColor !== undefined ? data.themeColor : p.themeColor,
      isActive: data.isActive ?? p.isActive,
      features:
        data.features !== undefined
          ? typeof data.features === 'string'
            ? data.features
            : JSON.stringify(data.features)
          : p.features,
    });
    return this.planRepo.save(p);
  }

  async deletePlan(id: string): Promise<void> {
    const p = await this.findPlanById(id);
    if (!p) throw new NotFoundException('Plan not found');
    if (isPublicPlanSlug(p.slug.trim().toLowerCase())) {
      throw new ForbiddenException('This plan is owned by application configuration and cannot be deleted via API.');
    }
    const r = await this.planRepo.delete(id);
    if (!r.affected) throw new NotFoundException('Plan not found');
  }

  async listUserSubscriptions(userId?: number): Promise<UserSubscription[]> {
    if (userId != null) {
      const u = await this.userRepo.findOne({ where: { id: userId } });
      if (!u) return [];
      const r = String(u.role ?? '').trim().toLowerCase();
      if (r === 'university' || r === 'university_owner') return [];
      if (isCommercialLikeUserRole(u.role)) return [];
      if (await this.findActiveInstitutionalAccess(userId)) return [];
    }
    const qb = this.subRepo.createQueryBuilder('s').leftJoinAndSelect('s.plan', 'plan').orderBy('s.createdAt', 'DESC');
    if (userId != null) qb.where('s.user_id = :userId', { userId });
    return qb.getMany();
  }

  /** Admin-only: assigns a plan with status `active` or `expired` (no trial). */
  async assignUserSubscription(
    userId: number,
    planId: string,
    status: 'active' | 'expired' = 'active',
    period?: { start?: Date; end?: Date },
  ): Promise<UserSubscription> {
    await this.assertLearnerSubscriptionAdminAllowed(userId);
    const plan = await this.findPlanById(planId);
    if (!plan) throw new NotFoundException('Plan not found');
    assertAdminLearnerPlanSlug(plan);

    let effStart = period?.start;
    let effEnd = period?.end;
    if (this.isFreeSubscriptionPlan(plan)) {
      const norm = this.normalizeFreePlanPeriodBounds(effStart ?? null, effEnd ?? null);
      if (effEnd && Math.abs(norm.end.getTime() - effEnd.getTime()) > 60_000) {
        this.logger.log(`[AdminSub] assign userId=${userId} free plan: period normalized to ${TRIAL_HOURS}h`);
      }
      effStart = norm.start;
      effEnd = norm.end;
    } else {
      if (status === 'active' && (!effStart || !effEnd)) {
        throw new BadRequestException(
          'Standard and Premium learner subscriptions require both period start and end dates.',
        );
      }
      if (effStart && effEnd) {
        assertAdminLearnerPaidPeriod(effStart, effEnd);
      }
    }
    const sub = this.subRepo.create({
      userId,
      planId,
      status,
      currentPeriodStart: effStart,
      currentPeriodEnd: effEnd,
      isTrialUsed: false,
      trialStartDate: undefined,
      trialEndDate: undefined,
    });
    const saved = await this.subRepo.save(sub);
    const withPlan =
      (await this.subRepo.findOne({ where: { id: saved.id }, relations: ['plan'] })) ?? saved;
    if (status === 'active' && plan.type !== 'free') {
      void this.notifyAdminAssignActive(withPlan, plan).catch((err: unknown) =>
        this.logger.warn(
          `[Mail] Admin assign subscription email failed userId=${userId}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
    return withPlan;
  }

  async updateUserSubscription(id: string, data: Record<string, unknown>): Promise<UserSubscription> {
    const s = await this.subRepo.findOne({ where: { id }, relations: ['plan'] });
    if (!s) throw new NotFoundException('Subscription not found');
    await this.assertLearnerSubscriptionAdminAllowed(s.userId);

    const prevPlanId = s.planId;
    const prevPlan = s.plan;
    const prevEnd = s.currentPeriodEnd ? new Date(s.currentPeriodEnd.getTime()) : null;

    // Map both camelCase aliases (sent by the admin modal) and direct entity field names.
    // Frontend sends periodStart/periodEnd; entity stores currentPeriodStart/currentPeriodEnd.
    if (data.status !== undefined)            s.status = data.status as SubscriptionStatus;
    if (data.periodStart !== undefined)       s.currentPeriodStart = data.periodStart ? new Date(data.periodStart as string) : undefined;
    if (data.periodEnd !== undefined)         s.currentPeriodEnd   = data.periodEnd   ? new Date(data.periodEnd   as string) : undefined;
    if (data.currentPeriodStart !== undefined) s.currentPeriodStart = data.currentPeriodStart ? new Date(data.currentPeriodStart as string) : undefined;
    if (data.currentPeriodEnd !== undefined)   s.currentPeriodEnd   = data.currentPeriodEnd   ? new Date(data.currentPeriodEnd   as string) : undefined;
    if (data.trialEndDate !== undefined)      s.trialEndDate = data.trialEndDate ? new Date(data.trialEndDate as string) : undefined;
    if (data.trialStartDate !== undefined)    s.trialStartDate = data.trialStartDate ? new Date(data.trialStartDate as string) : undefined;
    // When `plan` is eagerly loaded, only mutating `planId` can still persist the old FK from the
    // stale relation on save. Always attach the resolved plan row when the admin sends `planId`.
    if (data.planId !== undefined) {
      const raw = data.planId;
      if (typeof raw !== 'string' || !raw.trim()) {
        throw new NotFoundException('Plan not found');
      }
      const nextPlanId = raw.trim();
      const nextPlan = await this.findPlanById(nextPlanId);
      if (!nextPlan) throw new NotFoundException('Plan not found');
      if (nextPlanId !== prevPlanId) {
        this.logger.log(
          `[AdminSub] PATCH sub=${id} userId=${s.userId} planId ${prevPlanId} -> ${nextPlanId} (${nextPlan.slug})`,
        );
      }
      s.planId = nextPlanId;
      s.plan = nextPlan;
    }

    const planForNorm = s.plan ?? (await this.findPlanById(s.planId));
    if (!planForNorm) throw new NotFoundException('Plan not found');
    assertAdminLearnerPlanSlug(planForNorm);

    if (this.isFreeSubscriptionPlan(planForNorm)) {
      const norm = this.normalizeFreePlanPeriodBounds(s.currentPeriodStart ?? null, s.currentPeriodEnd ?? null);
      if (s.currentPeriodEnd && Math.abs(s.currentPeriodEnd.getTime() - norm.end.getTime()) > 60_000) {
        this.logger.log(`[AdminSub] PATCH sub=${id} free plan: period normalized to ${TRIAL_HOURS}h`);
      }
      s.currentPeriodStart = norm.start;
      s.currentPeriodEnd = norm.end;
      s.plan = planForNorm;
    } else {
      const ps = s.currentPeriodStart ?? null;
      const pe = s.currentPeriodEnd ?? null;
      if (ps && pe) {
        assertAdminLearnerPaidPeriod(ps, pe);
      } else if (s.status === 'active') {
        throw new BadRequestException(
          'Standard and Premium learner subscriptions require both period start and end dates.',
        );
      }
    }

    const saved = await this.subRepo.save(s);
    const full = await this.subRepo.findOne({ where: { id: saved.id }, relations: ['plan'] });
    if (full?.plan) {
      void this
        .notifyAdminSubscriptionPatch(full, { prevPlanId, prevPlan, prevEnd })
        .catch((err: unknown) =>
          this.logger.warn(
            `[Mail] Admin subscription update email failed id=${id}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }
    return full ?? saved;
  }

  /** Format dates like the payment fulfillment emails (en-GB short month). */
  private formatMailDate(d?: Date | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private async getUserEmailAndName(userId: number): Promise<{ email: string; name: string } | null> {
    const rows = await this.subRepo.manager.query(
      `SELECT email, "fullName" FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const row = rows?.[0];
    if (!row?.email) return null;
    const email = String(row.email);
    const name = row.fullName ? String(row.fullName) : email.split('@')[0];
    return { email, name };
  }

  private planRank(plan: SubscriptionPlan | null | undefined): number {
    if (!plan) return -1;
    if (plan.type === 'free') return 0;
    return (plan.sortOrder ?? 0) + 10;
  }

  /** New active paid assignment from admin — upgrade-style notice (no payment line). */
  private async notifyAdminAssignActive(sub: UserSubscription, plan: SubscriptionPlan): Promise<void> {
    const user = await this.getUserEmailAndName(sub.userId);
    if (!user) {
      this.logger.warn(`[Mail] Admin assign: no email for userId=${sub.userId}`);
      return;
    }
    const cycle = inferBillingCycleFromPeriod(sub.currentPeriodStart, sub.currentPeriodEnd) ?? 'Custom';
    await this.mailService.sendSubscriptionUpgrade(
      user.email,
      user.name,
      plan.name,
      '—',
      cycle,
      this.formatMailDate(sub.currentPeriodStart ?? new Date()),
    );
    this.logger.log(`[Mail] Admin assign → upgrade email sent to ${user.email} (${plan.name})`);
  }

  /**
   * After admin PATCH on user_subscriptions: send upgrade, downgrade, or renewal when it clearly
   * reflects a product change. Skips silent status-only edits and free-plan noise.
   */
  private async notifyAdminSubscriptionPatch(
    sub: UserSubscription,
    ctx: { prevPlanId: string; prevPlan: SubscriptionPlan | undefined; prevEnd: Date | null },
  ): Promise<void> {
    const newPlan = sub.plan;
    if (!newPlan) return;

    const user = await this.getUserEmailAndName(sub.userId);
    if (!user) {
      this.logger.warn(`[Mail] Admin subscription patch: no email for userId=${sub.userId}`);
      return;
    }

    const planChanged = ctx.prevPlanId !== sub.planId;

    if (planChanged && newPlan.type === 'free' && ctx.prevPlan && ctx.prevPlan.type !== 'free') {
      await this.mailService.sendSubscriptionDowngrade(
        user.email,
        user.name,
        ctx.prevPlan.name,
        newPlan.name,
        this.formatMailDate(sub.currentPeriodStart ?? new Date()),
      );
      this.logger.log(`[Mail] Admin patch → downgrade (to free) email sent to ${user.email}`);
      return;
    }

    if (newPlan.type === 'free') return;

    const newEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd.getTime()) : null;
    const extendMs = ctx.prevEnd && newEnd ? newEnd.getTime() - ctx.prevEnd.getTime() : 0;
    const extended = !planChanged && extendMs > 86400000; // > 1 day longer → treat as renewal

    if (planChanged && ctx.prevPlan) {
      const prevRank = this.planRank(ctx.prevPlan);
      const nextRank = this.planRank(newPlan);
      const effective = this.formatMailDate(sub.currentPeriodStart ?? new Date());

      if (nextRank < prevRank) {
        await this.mailService.sendSubscriptionDowngrade(
          user.email,
          user.name,
          ctx.prevPlan.name,
          newPlan.name,
          effective,
        );
        this.logger.log(`[Mail] Admin patch → downgrade email sent to ${user.email}`);
        return;
      }

      await this.mailService.sendSubscriptionUpgrade(
        user.email,
        user.name,
        newPlan.name,
        '—',
        inferBillingCycleFromPeriod(sub.currentPeriodStart, sub.currentPeriodEnd) ?? 'Custom',
        effective,
      );
      this.logger.log(`[Mail] Admin patch → upgrade email sent to ${user.email}`);
      return;
    }

    if (extended) {
      await this.mailService.sendSubscriptionRenewal(
        user.email,
        user.name,
        newPlan.name,
        '—',
        this.formatMailDate(new Date()),
        this.formatMailDate(newEnd),
      );
      this.logger.log(`[Mail] Admin patch → renewal email sent to ${user.email}`);
    }
  }

  private isExpired(date?: Date | null): boolean {
    if (!date) return false;
    return Date.now() >= date.getTime();
  }

  /** Active subscription for user (latest active) */
  async getActivePlanForUser(userId: number): Promise<SubscriptionPlan | null> {
    const access = await this.resolveAccessProfile(userId);
    if (!access.hasAccess || access.status !== 'active') {
      return null;
    }
    if (access.accessSource === 'institutional') {
      return this.findPlanBySlug('premium');
    }
    const sub = await this.getLatestSubscription(userId);
    if (!sub) return null;
    return sub?.plan ?? null;
  }

  async getLatestSubscription(userId: number): Promise<UserSubscription | null> {
    return this.subRepo.findOne({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async startTrial(userId: number, planSlug: string = FREE_PLAN_SLUG): Promise<UserSubscription> {
    const current = await this.getLatestSubscription(userId);
    if (current?.isTrialUsed) {
      throw new ConflictException('Trial already used for this account.');
    }

    const usedBefore = await this.subRepo.exist({ where: { userId, isTrialUsed: true } });
    if (usedBefore) {
      throw new ConflictException('Trial already used for this account.');
    }

    let plan = await this.findPlanBySlug(planSlug);
    if (!plan && planSlug === FREE_PLAN_SLUG) {
      plan = await this.findPlanBySlug(LEGACY_FREE_PLAN_SLUG);
    }
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const end = new Date(now.getTime() + TRIAL_HOURS * HOUR_MS);

    return this.subRepo.save(
      this.subRepo.create({
        userId,
        planId: plan.id,
        status: 'trial',
        trialStartDate: now,
        trialEndDate: end,
        isTrialUsed: true,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      }),
    );
  }

  async activatePaidSubscription(
    userId: number,
    planId: string,
    period?: { start?: Date; end?: Date },
  ): Promise<UserSubscription> {
    const latest = await this.getLatestSubscription(userId);

    // Expire any existing non-cancelled subscription (trial, active, or expired)
    // so the newly created row is unambiguously the authoritative one.
    if (latest && latest.status !== 'cancelled' && latest.status !== 'none') {
      const reason = latest.status === 'trial'
        ? 'expiring trial'
        : latest.planId !== planId
          ? `plan change (${latest.planId} → ${planId})`
          : 'renewal';
      this.logger.log(`[ActivatePaid] ${reason}: setting status=expired on sub ${latest.id} (was "${latest.status}") for userId=${userId}`);
      latest.status = 'expired';
      await this.subRepo.save(latest);
    }

    return this.subRepo.save(
      this.subRepo.create({
        userId,
        planId,
        status: 'active',
        currentPeriodStart: period?.start,
        currentPeriodEnd: period?.end,
        isTrialUsed: latest?.isTrialUsed ?? false,
      }),
    );
  }

  /**
   * Whether the learner may use dashboard APIs (not blocked by paywall).
   */
  async learnerDashboardAllowed(userId: number): Promise<boolean> {
    const dto = await this.evaluateAccess(userId);
    return dto.hasAccess;
  }

  /** Public free tier (code-owned slug or legacy free slug, or plan row type). */
  private isFreeSubscriptionPlan(plan?: SubscriptionPlan | null): boolean {
    if (!plan) return false;
    if (plan.type === 'free') return true;
    const slug = (plan.slug ?? '').trim().toLowerCase();
    return slug === FREE_PLAN_SLUG || slug === LEGACY_FREE_PLAN_SLUG;
  }

  /** Free plan is always exactly TRIAL_HOURS from period start (admin-supplied end is ignored). */
  private normalizeFreePlanPeriodBounds(start?: Date | null, _adminEnd?: Date | null): { start: Date; end: Date } {
    const s =
      start && !Number.isNaN(start.getTime())
        ? new Date(start.getTime())
        : new Date();
    return { start: s, end: new Date(s.getTime() + TRIAL_HOURS * HOUR_MS) };
  }

  private async loadBillingFromPayment(sub: UserSubscription): Promise<{
    billingCycle: 'monthly' | 'quarterly' | 'semester' | 'annual' | null;
  }> {
    if (this.isFreeSubscriptionPlan(sub.plan)) {
      return { billingCycle: null };
    }
    if (!sub.paymentTransactionId) {
      return { billingCycle: inferBillingCycleFromPeriod(sub.currentPeriodStart ?? null, sub.currentPeriodEnd ?? null) };
    }
    const tx = await this.paymentTxRepo.findOne({ where: { id: sub.paymentTransactionId } });
    if (tx?.billingCycle) {
      return { billingCycle: tx.billingCycle };
    }
    return { billingCycle: inferBillingCycleFromPeriod(sub.currentPeriodStart ?? null, sub.currentPeriodEnd ?? null) };
  }

  private baseDto(partial: Partial<SubscriptionAccessDto>): SubscriptionAccessDto {
    const d = new SubscriptionAccessDto();
    const kind = partial.kind ?? ('free' as SubscriptionKind);
    const derivedAccessSource: AccessSource = partial.kind === 'institutional_active'
      ? 'institutional'
      : partial.kind && partial.kind !== 'free'
        ? 'personal'
        : 'none';
    const derivedTier: PublicPlanSlug = effectivePublicPlanSlug(kind, partial.planSlug);
    const derivedEntitlements = entitlementsForSubscriptionState(kind, partial.planSlug);
    const limits = partial.contentLimits ?? this.toContentLimits(derivedEntitlements);
    const planName = partial.planName || (partial.kind === 'free' ? 'Plan de base (Gratuit)' : null);
    Object.assign(d, {
      remainingDays: 0,
      trialEndsAt: null,
      trialStartsAt: null,
      trialDaysUsed: 0,
      trialTotalDays: 1,
      trialHoursUsed: 0,
      trialTotalHours: TRIAL_HOURS,
      trialHoursRemaining: 0,
      periodStart: null,
      periodEnd: null,
      billingCycle: null,
      planSlug: null,
      paidPeriodProgress: 0,
      contentLimits: limits,
      accessSource: derivedAccessSource,
      roleContext: 'other',
      effectivePlanSlug: derivedTier,
      entitlements: derivedEntitlements,
      premiumEquivalent: isPremiumEquivalentSlug(derivedTier),
      canUsePersonalSubscriptionFlow: false,
      ...partial,
      planName,
    });
    return d;
  }

  async evaluateAccess(userId: number): Promise<SubscriptionAccessDto> {
    const institutional = await this.findActiveInstitutionalAccess(userId);
    if (institutional) {
      const entitlements = entitlementsForSubscriptionState('institutional_active', 'institutional');
      return this.baseDto({
        hasAccess: true,
        status: 'active',
        kind: 'institutional_active',
        planName: institutional.universityName,
        planSlug: 'institutional',
        remainingDays: 0,
        paidPeriodProgress: 0,
        contentLimits: this.toContentLimits(entitlements),
        accessSource: 'institutional',
        effectivePlanSlug: 'premium',
        entitlements,
        premiumEquivalent: true,
      });
    }

    const latest = await this.getLatestSubscription(userId);
    if (!latest) {
      try {
        await this.startTrial(userId);
        return await this.evaluateAccess(userId);
      } catch (err) {
        this.logger.error(`Failed to auto-start trial for user ${userId}`, err);
        return this.baseDto({
          hasAccess: true,
          status: 'none',
          kind: 'free',
        });
      }
    }

    const planName = latest.plan?.name ?? null;
    const planSlug = latest.plan?.slug ?? null;

    if (latest.status === 'trial') {
      if (!latest.trialEndDate) {
        // Do NOT write back to DB — row may be legacy / incomplete without trialEndDate.
        // Return expired in the response.
        return this.baseDto({
          hasAccess: false,
          status: 'expired',
          kind: 'trial_expired',
          planName,
          planSlug,
        });
      }
      const now = Date.now();
      const end = latest.trialEndDate.getTime();
      const startMs = latest.trialStartDate ? latest.trialStartDate.getTime() : now;
      if (now >= end) {
        // Return expired without writing to DB so admin overrides are preserved
        return this.baseDto({
          hasAccess: false,
          status: 'expired',
          kind: 'trial_expired',
          remainingDays: 0,
          trialEndsAt: toIso(latest.trialEndDate),
          trialStartsAt: toIso(latest.trialStartDate ?? null),
          trialDaysUsed: 1,
          trialHoursUsed: TRIAL_HOURS,
          trialHoursRemaining: 0,
          planName,
          planSlug,
        });
      }
      const msLeft = end - now;
      const msElapsed = now - startMs;
      const trialHoursUsed = Math.min(TRIAL_HOURS, Math.max(0, Math.floor(msElapsed / HOUR_MS)));
      const trialHoursRemaining = Math.max(0, Math.ceil(msLeft / HOUR_MS));
      const remainingDays = Math.max(0, Math.ceil(msLeft / DAY_MS));
      return this.baseDto({
        hasAccess: true,
        status: 'trial',
        kind: 'trial_active',
        remainingDays,
        trialEndsAt: toIso(latest.trialEndDate),
        trialStartsAt: toIso(latest.trialStartDate ?? null),
        trialDaysUsed: trialHoursUsed >= TRIAL_HOURS ? 1 : 0,
        trialTotalDays: 1,
        trialHoursUsed,
        trialTotalHours: TRIAL_HOURS,
        trialHoursRemaining,
        planName,
        planSlug,
      });
    }

    if (latest.status === 'active') {
      // Admin-assigned free plan uses status "active" in DB; treat as free tier (24h), not paid monthly.
      if (this.isFreeSubscriptionPlan(latest.plan)) {
        const rawStart = latest.currentPeriodStart;
        const rawEnd = latest.currentPeriodEnd;
        let periodAnchor: Date | null =
          rawStart && !Number.isNaN(rawStart.getTime()) ? new Date(rawStart.getTime()) : null;
        if (!periodAnchor && rawEnd && !Number.isNaN(rawEnd.getTime())) {
          periodAnchor = new Date(rawEnd.getTime() - TRIAL_HOURS * HOUR_MS);
        }
        if (!periodAnchor) {
          return this.baseDto({
            hasAccess: false,
            status: 'expired',
            kind: 'trial_expired',
            remainingDays: 0,
            trialEndsAt: toIso(rawEnd ?? null),
            trialStartsAt: toIso(rawStart ?? null),
            trialDaysUsed: 1,
            trialHoursUsed: TRIAL_HOURS,
            trialHoursRemaining: 0,
            periodStart: toIso(rawStart ?? null),
            periodEnd: toIso(rawEnd ?? null),
            billingCycle: null,
            planName,
            planSlug,
          });
        }
        const { start: freeStart, end: freeEnd } = this.normalizeFreePlanPeriodBounds(periodAnchor, rawEnd ?? null);
        if (this.isExpired(freeEnd) || Number.isNaN(freeEnd.getTime())) {
          return this.baseDto({
            hasAccess: false,
            status: 'expired',
            kind: 'trial_expired',
            remainingDays: 0,
            trialEndsAt: toIso(freeEnd),
            trialStartsAt: toIso(freeStart),
            trialDaysUsed: 1,
            trialHoursUsed: TRIAL_HOURS,
            trialHoursRemaining: 0,
            periodStart: toIso(freeStart),
            periodEnd: toIso(freeEnd),
            billingCycle: null,
            planName,
            planSlug,
          });
        }

        const driftEnd =
          rawEnd && !Number.isNaN(rawEnd.getTime()) && Math.abs(rawEnd.getTime() - freeEnd.getTime()) > 60_000;
        const driftStart =
          rawStart &&
          !Number.isNaN(rawStart.getTime()) &&
          Math.abs(rawStart.getTime() - freeStart.getTime()) > 60_000;
        if (latest.id && (driftEnd || driftStart)) {
          this.logger.log(
            `[Access] Free plan period normalized for userId=${userId} sub=${latest.id} (persist 24h window)`,
          );
          await this.subRepo.update(latest.id, {
            currentPeriodStart: freeStart,
            currentPeriodEnd: freeEnd,
          });
        }

        const windowMs = TRIAL_HOURS * HOUR_MS;
        const now = Date.now();
        const msLeft = freeEnd.getTime() - now;
        const msElapsed = now - freeStart.getTime();
        let trialHoursUsed = Math.min(TRIAL_HOURS, Math.max(0, Math.floor(msElapsed / HOUR_MS)));
        let trialHoursRemaining = Math.max(0, Math.ceil(msLeft / HOUR_MS));
        trialHoursRemaining = Math.min(trialHoursRemaining, Math.max(0, TRIAL_HOURS - trialHoursUsed));
        const remainingDays = Math.max(0, Math.ceil(msLeft / DAY_MS));
        const paidPeriodProgress = Math.min(1, Math.max(0, msElapsed / windowMs));
        return this.baseDto({
          hasAccess: true,
          status: 'active',
          kind: 'free',
          remainingDays,
          trialEndsAt: toIso(freeEnd),
          trialStartsAt: toIso(freeStart),
          trialDaysUsed: trialHoursUsed >= TRIAL_HOURS ? 1 : 0,
          trialTotalDays: 1,
          trialHoursUsed,
          trialTotalHours: TRIAL_HOURS,
          trialHoursRemaining,
          periodStart: toIso(freeStart),
          periodEnd: toIso(freeEnd),
          billingCycle: null,
          planName,
          planSlug,
          paidPeriodProgress,
          accessSource: 'personal',
        });
      }
      if (this.isExpired(latest.currentPeriodEnd ?? null)) {
        // currentPeriodEnd is in the past — return expired in response but do NOT
        // write back to DB. Admin may have explicitly set status=active; writing
        // back would silently undo that change on the next access check.
        return this.baseDto({
          hasAccess: false,
          status: 'expired',
          kind: 'paid_expired',
          trialEndsAt: toIso(latest.trialEndDate ?? null),
          periodStart: toIso(latest.currentPeriodStart ?? null),
          periodEnd: toIso(latest.currentPeriodEnd ?? null),
          planName,
          planSlug,
        });
      }
      const { billingCycle } = await this.loadBillingFromPayment(latest);
      const periodStart = latest.currentPeriodStart ?? null;
      const periodEnd = latest.currentPeriodEnd ?? null;
      let remainingDays = 0;
      let paidPeriodProgress = 0;
      if (periodEnd) {
        const msLeft = periodEnd.getTime() - Date.now();
        remainingDays = Math.max(0, Math.ceil(msLeft / DAY_MS));
      }
      if (periodStart && periodEnd && periodEnd.getTime() > periodStart.getTime()) {
        const total = periodEnd.getTime() - periodStart.getTime();
        const elapsed = Math.min(total, Math.max(0, Date.now() - periodStart.getTime()));
        paidPeriodProgress = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
      }
      return this.baseDto({
        hasAccess: true,
        status: 'active',
        kind: 'paid_active',
        remainingDays,
        trialEndsAt: toIso(latest.trialEndDate ?? null),
        periodStart: toIso(periodStart),
        periodEnd: toIso(periodEnd),
        billingCycle,
        planName,
        planSlug,
        paidPeriodProgress,
        accessSource: 'personal',
      });
    }

    if (latest.status === 'pending_payment') {
      const kind: SubscriptionKind = 'pending_payment';
      return this.baseDto({
        hasAccess: false,
        status: 'pending_payment',
        kind,
        planName,
        planSlug,
      });
    }

    if (latest.status === 'cancelled') {
      return this.baseDto({
        hasAccess: false,
        status: 'cancelled',
        kind: 'cancelled',
        planName,
        planSlug,
      });
    }

    if (latest.status === 'expired' || latest.status === 'none') {
      const isPaid = Boolean(latest.paymentTransactionId);
      const isExpiredNone = latest.status === 'none' && this.isExpired(latest.currentPeriodEnd ?? null);
      
      return this.baseDto({
        hasAccess: !isExpiredNone && latest.status === 'none',
        status: isExpiredNone ? 'expired' : latest.status,
        kind: isPaid ? 'paid_expired' : 'trial_expired',
        trialEndsAt: toIso(latest.trialEndDate ?? null),
        periodStart: toIso(latest.currentPeriodStart ?? null),
        periodEnd: toIso(latest.currentPeriodEnd ?? null),
        planName: latest.status === 'none' ? 'Plan de base (Gratuit)' : planName,
        planSlug,
      });
    }

    return this.baseDto({
      hasAccess: false,
      status: latest.status,
      kind: 'trial_expired',
      trialEndsAt: toIso(latest.trialEndDate ?? null),
      planName,
      planSlug,
    });
  }
}
