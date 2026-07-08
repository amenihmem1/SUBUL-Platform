import {
  Injectable, Logger, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as crypto from 'crypto';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralReward, RewardStatus } from './entities/referral-reward.entity';
import { PayoutAccount, PayoutMethod } from './entities/payout-account.entity';
import { PayoutRequest } from './entities/payout-request.entity';
import { PayoutRequestItem } from './entities/payout-request-item.entity';
import { ReferralAuditLog } from './entities/referral-audit-log.entity';

/** How many qualified referrals unlock the reward */
const MILESTONE = 20;

/** Reward in millimes (100 TND × 1000) */
const REWARD_AMOUNT_CENTS = 100_000;

/** If referred user's account is younger than this at payment time → fraud flag */
const MIN_ACCOUNT_AGE_HOURS = 24;

/** Max number of referrals from the same signup IP in a 30-day window */
const MAX_REFERRALS_PER_IP = 5;

/** How many days a referred user must stay subscribed before reward fully unlocks */
const MIN_DAYS_SUBSCRIBED_BEFORE_UNLOCK = 0; // product decision: qualify immediately after payment

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly codeRepo: Repository<ReferralCode>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly rewardRepo: Repository<ReferralReward>,
    @InjectRepository(PayoutAccount)
    private readonly payoutAccountRepo: Repository<PayoutAccount>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRequestRepo: Repository<PayoutRequest>,
    @InjectRepository(PayoutRequestItem)
    private readonly payoutRequestItemRepo: Repository<PayoutRequestItem>,
    @InjectRepository(ReferralAuditLog)
    private readonly auditRepo: Repository<ReferralAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  private async audit(
    entityType: 'referral' | 'reward' | 'payout_request' | 'payout_account',
    entityId: string,
    action: string,
    oldStatus: string | null,
    newStatus: string | null,
    changedBy: number | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          entityType,
          entityId,
          action,
          oldStatus,
          newStatus,
          changedBy,
          metadata: metadata ?? null,
        }),
      );
    } catch {
      // best-effort; audit must never block core flows
    }
  }

  // ─── Referral Code Management ─────────────────────────────────────────────

  async getOrCreateCode(userId: number): Promise<ReferralCode> {
    const existing = await this.codeRepo.findOne({ where: { userId } });
    if (existing) return existing;

    // Generate a unique 8-char alphanumeric code (uppercase)
    let code: string;
    let attempts = 0;
    do {
      code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F29C11"
      attempts++;
      if (attempts > 20) throw new Error('Could not generate unique referral code');
    } while (await this.codeRepo.findOne({ where: { code } }));

    return this.codeRepo.save(this.codeRepo.create({ userId, code }));
  }

  /** Resolve a code string to the owning userId */
  async resolveCode(code: string): Promise<number | null> {
    const record = await this.codeRepo.findOne({ where: { code: code.toUpperCase().trim() } });
    return record?.userId ?? null;
  }

  // ─── Lifecycle Hooks ─────────────────────────────────────────────────────

  /**
   * Called during user registration when a `ref` query param is present.
   * Creates a referral record in 'pending' status.
   * Runs fraud checks and flags suspicious records instead of throwing.
   */
  async trackSignup(referredUserId: number, refCode: string, signupIp?: string): Promise<void> {
    try {
      const code = refCode.toUpperCase().trim();
      const referrerId = await this.resolveCode(code);

      if (!referrerId) {
        this.logger.warn(`[Referral] trackSignup: code "${code}" not found — ignored`);
        return;
      }

      // Anti-fraud: self-referral
      if (referrerId === referredUserId) {
        this.logger.warn(`[Referral] Self-referral blocked: userId=${referredUserId}`);
        return;
      }

      // Idempotency: already referred
      const exists = await this.referralRepo.findOne({ where: { referredUserId } });
      if (exists) {
        this.logger.log(`[Referral] User ${referredUserId} already has a referral record — skipping`);
        return;
      }

      const fraudFlags: string[] = [];

      // Anti-fraud: IP abuse — too many signups from the same IP in 30 days
      if (signupIp) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const ipCount = await this.referralRepo
          .createQueryBuilder('r')
          .where('r.signup_ip = :ip', { ip: signupIp })
          .andWhere('r.created_at > :since', { since: thirtyDaysAgo })
          .getCount();
        if (ipCount >= MAX_REFERRALS_PER_IP) {
          fraudFlags.push('ip_bulk_abuse');
          this.logger.warn(`[Referral] IP bulk abuse detected for IP=${signupIp} (${ipCount} referrals in 30 days)`);
        }

        // Anti-fraud: same IP as referrer's last login
        const referrerRows = await this.dataSource.query(
          `SELECT last_login FROM users WHERE id = $1 LIMIT 1`,
          [referrerId],
        );
        // We don't store referrer IP easily, but we can check if the referrer's IP is the same.
        // As a proxy: check if referrer also signed up from same IP
        const referrerRefCode = await this.codeRepo.findOne({ where: { userId: referrerId } });
        if (referrerRefCode) {
          const sameIpAsReferrer = await this.referralRepo.findOne({
            where: { referredUserId: referrerId, signupIp },
          });
          if (sameIpAsReferrer) {
            fraudFlags.push('same_ip_as_referrer');
          }
        }
      }

      // Anti-fraud: same phone number as referrer
      const referredPhone = await this.dataSource.query(
        `SELECT phone FROM users WHERE id = $1 LIMIT 1`, [referredUserId],
      );
      const referrerPhone = await this.dataSource.query(
        `SELECT phone FROM users WHERE id = $1 LIMIT 1`, [referrerId],
      );
      if (
        referredPhone[0]?.phone &&
        referrerPhone[0]?.phone &&
        referredPhone[0].phone === referrerPhone[0].phone
      ) {
        fraudFlags.push('same_phone_as_referrer');
        this.logger.warn(`[Referral] Same phone detected referrer=${referrerId} referred=${referredUserId}`);
      }

      const referral = this.referralRepo.create({
        referrerUserId: referrerId,
        referredUserId,
        referralCodeUsed: code,
        status: fraudFlags.length > 0 ? 'fraud_flagged' : 'created',
        signupAt: new Date(),
        signupIp: signupIp ?? null,
        fraudFlags: fraudFlags.length > 0 ? fraudFlags : null,
        fraudScore: fraudFlags.length > 0 ? 50 : 0,
      });

      await this.referralRepo.save(referral);
      await this.audit('referral', referral.id, 'CREATED', null, referral.status, null, { signupIp });
      this.logger.log(
        `[Referral] Tracked signup: referrer=${referrerId} referred=${referredUserId} ` +
        `code=${code} fraud_flags=${fraudFlags.join(',') || 'none'}`,
      );
    } catch (err) {
      // Never block signup due to referral errors
      this.logger.error(
        `[Referral] trackSignup error (non-blocking): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Called after email verification completes.
   * Advances 'pending' referral to 'email_verified'.
   */
  async onEmailVerified(userId: number): Promise<void> {
    try {
      const referral = await this.referralRepo.findOne({
        where: { referredUserId: userId, status: In(['created', 'pending'] as ReferralStatus[]) },
      });
      if (!referral) return;

      const old = referral.status;
      referral.status = 'email_verified';
      referral.emailVerifiedAt = new Date();
      await this.referralRepo.save(referral);
      await this.audit('referral', referral.id, 'STATUS_CHANGED', old, referral.status, null);
      this.logger.log(`[Referral] Email verified: referredUserId=${userId} referral=${referral.id}`);
    } catch (err) {
      this.logger.error(`[Referral] onEmailVerified error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Called after a paid subscription is activated (in fulfillSubscription).
   * Advances 'email_verified' referral to 'qualified', then checks for milestone reward.
   */
  async onSubscriptionActivated(userId: number): Promise<void> {
    try {
      const referral = await this.referralRepo.findOne({ where: { referredUserId: userId } });
      if (!referral) return;

      // Enforce email verification as part of qualification (do not qualify unverified).
      const userRows = await this.dataSource.query(
        `SELECT created_at, phone, is_email_verified FROM users WHERE id = $1 LIMIT 1`, [userId],
      );
      const isEmailVerified = !!userRows?.[0]?.is_email_verified;
      if (!isEmailVerified) {
        if (!['fraud_flagged', 'rejected', 'disqualified'].includes(referral.status)) {
          const old = referral.status;
          referral.status = 'payment_pending';
          referral.activatedAt = referral.activatedAt ?? new Date();
          await this.referralRepo.save(referral);
          await this.audit('referral', referral.id, 'STATUS_CHANGED', old, referral.status, null, { reason: 'email_not_verified' });
        }
        return;
      }

      if (referral.status === 'created' || referral.status === 'pending') {
        referral.status = 'email_verified';
        referral.emailVerifiedAt = referral.emailVerifiedAt ?? new Date();
      }

      // Anti-fraud: check account age at payment time
      if (userRows[0]?.created_at) {
        const ageMs = Date.now() - new Date(userRows[0].created_at).getTime();
        const ageHours = ageMs / 3600_000;
        if (ageHours < MIN_ACCOUNT_AGE_HOURS) {
          const flags = [...(referral.fraudFlags ?? []), 'paid_too_soon'];
          referral.fraudFlags = flags;
          referral.status = 'fraud_flagged';
          await this.referralRepo.save(referral);
          await this.audit('referral', referral.id, 'FRAUD_FLAGGED', null, referral.status, null, { flags });
          this.logger.warn(
            `[Referral] Fraud: referred user ${userId} paid within ${ageHours.toFixed(1)}h of signup`,
          );
          return;
        }
      }

      // Check if referred user's phone matches the referrer's phone
      if (userRows[0]?.phone) {
        const referrerPhone = await this.dataSource.query(
          `SELECT phone FROM users WHERE id = $1 LIMIT 1`, [referral.referrerUserId],
        );
        if (referrerPhone[0]?.phone && referrerPhone[0].phone === userRows[0].phone) {
          const flags = [...(referral.fraudFlags ?? []), 'same_phone_as_referrer'];
          referral.fraudFlags = [...new Set(flags)];
          referral.status = 'fraud_flagged';
          await this.referralRepo.save(referral);
          await this.audit('referral', referral.id, 'FRAUD_FLAGGED', null, referral.status, null, { flags: referral.fraudFlags });
          this.logger.warn(`[Referral] Fraud: same phone referrer=${referral.referrerUserId} referred=${userId}`);
          return;
        }
      }

      const old = referral.status;
      referral.status = 'qualified';
      referral.qualifiedAt = new Date();
      await this.referralRepo.save(referral);
      await this.audit('referral', referral.id, 'STATUS_CHANGED', old, referral.status, null);
      this.logger.log(`[Referral] Qualified: referredUserId=${userId} referrer=${referral.referrerUserId}`);

      await this.checkAndCreateRewards(referral.referrerUserId);
    } catch (err) {
      this.logger.error(
        `[Referral] onSubscriptionActivated error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Called when a paid subscription is refunded/charged back.
   * Disqualifies the referral and reverses any *unpaid* reward blocks if needed.
   */
  async onSubscriptionReversed(userId: number, reason: 'refund' | 'chargeback'): Promise<void> {
    try {
      const referral = await this.referralRepo.findOne({ where: { referredUserId: userId } });
      if (!referral) return;
      if (['disqualified', 'fraud_flagged', 'rejected'].includes(referral.status)) return;

      const old = referral.status;
      referral.status = 'disqualified';
      referral.disqualifiedAt = new Date();
      referral.disqualificationReason = reason;
      await this.referralRepo.save(referral);
      await this.audit('referral', referral.id, 'STATUS_CHANGED', old, referral.status, null, { reason });

      await this.recomputeAndReverseRewards(referral.referrerUserId);
    } catch (err) {
      this.logger.error(
        `[Referral] onSubscriptionReversed error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Ensure reward ledger matches current qualified count.
   * If qualified blocks decreased, reverse highest unpaid blocks first.
   */
  private async recomputeAndReverseRewards(referrerId: number): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const [{ c: qualifiedCountRaw }] = await em.query(
        `SELECT COUNT(*)::int AS c
         FROM (
           SELECT id
           FROM referrals
           WHERE referrer_user_id = $1
             AND status IN ('qualified','rewarded')
           FOR UPDATE
         ) locked_referrals`,
        [referrerId],
      );
      const qualifiedCount = Number(qualifiedCountRaw ?? 0);
      const totalBlocks = Math.floor(qualifiedCount / MILESTONE);

      const rewards = await em.getRepository(ReferralReward).find({
        where: { userId: referrerId },
        order: { rewardBlock: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      const activeRewards = rewards.filter((r) => !['cancelled', 'reversed'].includes(r.status));
      const existingBlocks = activeRewards.length;
      const excess = existingBlocks - totalBlocks;
      if (excess <= 0) return;

      const toReverse = activeRewards
        .filter((r) => ['claimable', 'reserved', 'approved'].includes(r.status))
        .sort((a, b) => (b.rewardBlock ?? 0) - (a.rewardBlock ?? 0))
        .slice(0, excess);

      for (const r of toReverse) {
        const old = r.status;
        r.status = 'reversed';
        r.reversedAt = new Date();
        await em.getRepository(ReferralReward).save(r);
        await this.audit('reward', r.id, 'STATUS_CHANGED', old, r.status, null, { reason: 'referral_disqualified' });

        // If this reward was part of a payout request, keep request consistent.
        if (r.payoutRequestId) {
          const reqRepo = em.getRepository(PayoutRequest);
          const itemRepo = em.getRepository(PayoutRequestItem);
          const req = await reqRepo.findOne({ where: { id: r.payoutRequestId }, lock: { mode: 'pessimistic_write' } });
          if (req && req.status !== 'paid') {
            const items = await itemRepo.find({ where: { payoutRequestId: req.id } });
            const rewardIds = items.map((it) => it.referralRewardId);
            const stillReserved = await em.getRepository(ReferralReward).find({
              where: { id: In(rewardIds) },
            });
            const totalCents = stillReserved
              .filter((x) => x.payoutRequestId === req.id && x.status !== 'reversed')
              .reduce((s, x) => s + x.amountCents, 0);
            req.totalAmountCents = totalCents;
            req.adminNotes = `${req.adminNotes ?? ''}\n[system] Reward reversed due to refund/chargeback; request total adjusted.`;
            if (req.status === 'approved') {
              req.status = 'under_review';
              req.reviewedAt = new Date();
            }
            await reqRepo.save(req);
            await this.audit('payout_request', req.id, 'UPDATED', null, req.status, null, { adjustedTotalCents: totalCents });
          }
        }
      }
    });
  }

  /**
   * Recurring milestone rewards:
   * - every completed block of 20 qualified referrals unlocks 100 TND
   * - user may claim at 20, or wait and claim at 40/60/100 later
   * - idempotent & race-safe (transaction + locks + unique (user_id, reward_block))
   */
  private async checkAndCreateRewards(referrerId: number): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      // Lock referrals rows for this referrer to prevent concurrent block allocation.
      const [{ c: qualifiedCountRaw }] = await em.query(
        `SELECT COUNT(*)::int AS c
         FROM (
           SELECT id
           FROM referrals
           WHERE referrer_user_id = $1
             AND status IN ('qualified','rewarded')
           FOR UPDATE
         ) locked_referrals`,
        [referrerId],
      );
      const qualifiedCount = Number(qualifiedCountRaw ?? 0);
      const totalBlocks = Math.floor(qualifiedCount / MILESTONE);
      if (totalBlocks <= 0) return;

      const existingBlocksRows: Array<{ c: number }> = await em.query(
        `SELECT COUNT(*)::int AS c
         FROM referral_rewards
         WHERE user_id = $1
           AND status NOT IN ('cancelled','reversed')`,
        [referrerId],
      );
      const existingBlocks = Number(existingBlocksRows?.[0]?.c ?? 0);
      const blocksToCreate = totalBlocks - existingBlocks;
      if (blocksToCreate <= 0) return; // idempotent

      for (let i = 0; i < blocksToCreate; i++) {
        const blockNumber = existingBlocks + i + 1;

        // Select the 20 oldest qualified referrals not yet allocated.
        const referralsToMark: Referral[] = await em.getRepository(Referral).find({
          where: { referrerUserId: referrerId, status: 'qualified' },
          order: { qualifiedAt: 'ASC', createdAt: 'ASC' },
          take: MILESTONE,
          lock: { mode: 'pessimistic_write' },
        });
        if (referralsToMark.length < MILESTONE) {
          // Count says we should have enough, but rows might be in-flight; stop here safely.
          break;
        }

        const rewardRepo = em.getRepository(ReferralReward);
        const reward = rewardRepo.create({
          userId: referrerId,
          rewardBlock: blockNumber,
          milestoneTarget: MILESTONE,
          amountCents: REWARD_AMOUNT_CENTS,
          currency: 'TND',
          status: 'claimable',
          unlockedAt: new Date(),
          claimableAt: new Date(),
          payoutRequestId: null,
          ruleSnapshot: {
            milestone: MILESTONE,
            amount_cents: REWARD_AMOUNT_CENTS,
            waiting_days: MIN_DAYS_SUBSCRIBED_BEFORE_UNLOCK,
          },
        });

        // Insert via save (unique constraint on (user_id, reward_block) prevents duplicates)
        await rewardRepo.save(reward);
        await this.audit('reward', reward.id, 'REWARD_UNLOCKED', null, reward.status, null, {
          blockNumber,
          qualifiedCount,
        });

        // Mark referrals as rewarded for this block
        for (const r of referralsToMark) {
          const old = r.status;
          r.status = 'rewarded';
          r.rewardedAt = new Date();
          await em.getRepository(Referral).save(r);
          await this.audit('referral', r.id, 'STATUS_CHANGED', old, r.status, null, {
            rewardBlock: blockNumber,
            rewardId: reward.id,
          });
        }

        this.logger.log(
          `[Referral] Reward block ${blockNumber} created for referrer ${referrerId} (qualified=${qualifiedCount})`,
        );
      }
    });
  }

  // ─── User-facing Queries ──────────────────────────────────────────────────

  async getMyStats(userId: number): Promise<{
    referralCode: string;
    referralLink: string;
    totalInvited: number;
    emailVerified: number;
    qualified: number;
    milestone: number;
    progressPercent: number;
    rewards: ReferralReward[];
    claimableAmountCents: number;
    referrals: Referral[];
  }> {
    const codeRecord = await this.getOrCreateCode(userId);
    const frontendUrl = (process.env.FRONTEND_URL || 'https://subul.tn').replace(/\/+$/, '');
    // Use locale-agnostic path; frontend i18n/middleware will route to the right locale.
    const referralLink = `${frontendUrl}/auth/register?ref=${codeRecord.code}`;

    const referrals = await this.referralRepo.find({
      where: { referrerUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const totalInvited = referrals.length;
    const emailVerified = referrals.filter((r) => ['email_verified', 'qualified', 'rewarded'].includes(r.status)).length;
    const qualified = referrals.filter((r) => ['qualified', 'rewarded'].includes(r.status)).length;

    const rewards = await this.rewardRepo.find({
      where: { userId },
      order: { rewardBlock: 'DESC', createdAt: 'DESC' },
    });
    const claimable = rewards.filter((r) => r.status === 'claimable');
    const claimableAmountCents = claimable.reduce((s, r) => s + (r.amountCents || 0), 0);

    return {
      referralCode: codeRecord.code,
      referralLink,
      totalInvited,
      emailVerified,
      qualified,
      milestone: MILESTONE,
      progressPercent: Math.min(100, Math.round((qualified / MILESTONE) * 100)),
      rewards,
      claimableAmountCents,
      referrals,
    };
  }

  // requestPayout is replaced by payout-accounts + payout-requests (ledger-safe)

  async listMyRewards(userId: number): Promise<ReferralReward[]> {
    return this.rewardRepo.find({ where: { userId }, order: { rewardBlock: 'DESC', createdAt: 'DESC' } });
  }

  async listPayoutAccounts(userId: number): Promise<PayoutAccount[]> {
    return this.payoutAccountRepo.find({ where: { userId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createPayoutAccount(
    userId: number,
    method: PayoutMethod,
    accountDetails: Record<string, string>,
    label?: string,
  ): Promise<PayoutAccount> {
    if (!accountDetails || Object.keys(accountDetails).length === 0) {
      throw new BadRequestException('Payout details are required.');
    }
    if (method === 'bank') {
      if (!accountDetails.iban && !accountDetails.accountNumber) {
        throw new BadRequestException('Bank account number or IBAN is required.');
      }
    }
    if (method === 'd17') {
      if (!accountDetails.phone) throw new BadRequestException('D17 phone number is required.');
    }
    const acc = await this.payoutAccountRepo.save(
      this.payoutAccountRepo.create({
        userId,
        method,
        label: label?.trim() ? label.trim() : null,
        accountDetails,
        isActive: true,
      }),
    );
    await this.audit('payout_account', acc.id, 'CREATED', null, null, userId, { method });
    return acc;
  }

  async deactivatePayoutAccount(userId: number, accountId: string): Promise<{ ok: true }> {
    const acc = await this.payoutAccountRepo.findOne({ where: { id: accountId, userId } });
    if (!acc) throw new NotFoundException('Payout account not found.');
    if (!acc.isActive) return { ok: true };
    acc.isActive = false;
    await this.payoutAccountRepo.save(acc);
    await this.audit('payout_account', acc.id, 'DEACTIVATED', null, null, userId);
    return { ok: true };
  }

  async listMyPayoutRequests(userId: number): Promise<Array<PayoutRequest & { items: PayoutRequestItem[] }>> {
    const requests = await this.payoutRequestRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    if (requests.length === 0) return [];
    const items = await this.payoutRequestItemRepo.find({
      where: { payoutRequestId: In(requests.map((r) => r.id)) },
      order: { createdAt: 'DESC' },
    });
    const byReq = new Map<string, PayoutRequestItem[]>();
    for (const it of items) {
      const arr = byReq.get(it.payoutRequestId) ?? [];
      arr.push(it);
      byReq.set(it.payoutRequestId, arr);
    }
    return requests.map((r) => Object.assign(r, { items: byReq.get(r.id) ?? [] }));
  }

  async createPayoutRequest(
    userId: number,
    rewardIds: string[],
    payoutAccountId: string,
  ): Promise<PayoutRequest> {
    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      throw new BadRequestException('Select at least one reward to claim.');
    }
    return this.dataSource.transaction(async (em) => {
      const rewards = await em.getRepository(ReferralReward).find({
        where: { id: In(rewardIds), userId, status: 'claimable' },
        lock: { mode: 'pessimistic_write' },
      });
      if (rewards.length !== rewardIds.length) {
        throw new BadRequestException('Some rewards are not claimable or do not belong to you.');
      }

      const account = await em.getRepository(PayoutAccount).findOne({
        where: { id: payoutAccountId, userId, isActive: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (!account) throw new NotFoundException('Payout account not found.');

      const totalCents = rewards.reduce((s, r) => s + r.amountCents, 0);
      const req = await em.getRepository(PayoutRequest).save(
        em.getRepository(PayoutRequest).create({
          userId,
          payoutAccountId: account.id,
          payoutMethod: account.method,
          payoutDetails: account.accountDetails, // snapshot
          totalAmountCents: totalCents,
          rewardCount: rewards.length,
          status: 'submitted',
          submittedAt: new Date(),
        }),
      );
      await this.audit('payout_request', req.id, 'CREATED', null, req.status, userId, {
        rewardIds,
        totalCents,
      });

      for (const r of rewards) {
        await em.getRepository(PayoutRequestItem).save(
          em.getRepository(PayoutRequestItem).create({
            payoutRequestId: req.id,
            referralRewardId: r.id,
            amountCents: r.amountCents,
          }),
        );
        const old = r.status;
        r.status = 'reserved';
        r.reservedAt = new Date();
        r.payoutRequestId = req.id;
        await em.getRepository(ReferralReward).save(r);
        await this.audit('reward', r.id, 'STATUS_CHANGED', old, r.status, userId, { payoutRequestId: req.id });
      }

      return req;
    });
  }

  async claimAll(userId: number, payoutAccountId: string): Promise<PayoutRequest> {
    const rewards = await this.rewardRepo.find({ where: { userId, status: 'claimable' }, order: { rewardBlock: 'ASC' } });
    if (rewards.length === 0) throw new BadRequestException('No claimable rewards available.');
    return this.createPayoutRequest(userId, rewards.map((r) => r.id), payoutAccountId);
  }

  /**
   * Recompute referral states for a given user (or all users if userId is undefined).
   * Repairs data where referral status is inconsistent with actual email/subscription state.
   * Safe to call multiple times (idempotent).
   */
  async recompute(userId?: number): Promise<{ fixed: number; checked: number }> {
    const where = userId ? { referredUserId: userId } : {};
    const referrals = await this.referralRepo.find({ where, order: { createdAt: 'DESC' } });

    let fixed = 0;
    for (const ref of referrals) {
      if (['rejected', 'fraud', 'rewarded'].includes(ref.status)) continue;

      // Check actual email verification
      const userRows = await this.dataSource.query(
        `SELECT is_email_verified, email_verified_at FROM users WHERE id = $1`, [ref.referredUserId],
      );
      const user = userRows[0];
      if (!user) continue;

      const emailVerified = user.is_email_verified;

      // Check actual paid subscription
      const subRows = await this.dataSource.query(
        `SELECT id FROM user_subscriptions WHERE user_id = $1 AND subscription_status = 'active' LIMIT 1`,
        [ref.referredUserId],
      );
      const hasPaidSub = subRows.length > 0;

      let changed = false;
      if (hasPaidSub && ref.status !== 'qualified') {
        ref.status = 'qualified';
        ref.emailVerifiedAt = ref.emailVerifiedAt ?? (user.email_verified_at ? new Date(user.email_verified_at) : new Date());
        ref.qualifiedAt = ref.qualifiedAt ?? new Date();
        changed = true;
      } else if (emailVerified && ref.status === 'pending') {
        ref.status = 'email_verified';
        ref.emailVerifiedAt = ref.emailVerifiedAt ?? (user.email_verified_at ? new Date(user.email_verified_at) : new Date());
        changed = true;
      }

      if (changed) {
        await this.referralRepo.save(ref);
        fixed++;
      }
    }

    // After recompute, check if any referrers now qualify for rewards
    const referrerIds = [...new Set(referrals.map((r) => r.referrerUserId))];
    for (const referrerId of referrerIds) {
      await this.checkAndCreateRewards(referrerId);
    }

    return { fixed, checked: referrals.length };
  }

  // ─── Admin Queries ────────────────────────────────────────────────────────

  async adminListReferrals(opts: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.id, r.referrer_user_id, r.referred_user_id, r.referral_code_used,
        r.status, r.signup_at, r.email_verified_at, r.qualified_at, r.rewarded_at,
        r.fraud_flags, r.admin_notes, r.signup_ip, r.created_at,
        ru.email AS referrer_email, ru.fullname AS referrer_name,
        rd.email AS referred_email, rd.fullname AS referred_name
      FROM referrals r
      LEFT JOIN users ru ON ru.id = r.referrer_user_id
      LEFT JOIN users rd ON rd.id = r.referred_user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let i = 1;

    if (opts.status && opts.status !== 'all') {
      query += ` AND r.status = $${i++}`;
      params.push(opts.status);
    }
    if (opts.search) {
      query += ` AND (ru.email ILIKE $${i} OR rd.email ILIKE $${i} OR r.referral_code_used ILIKE $${i})`;
      params.push(`%${opts.search}%`);
      i++;
    }

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) sub`, params,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    query += ` ORDER BY r.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const data = await this.dataSource.query(query, params);
    return { data, total };
  }

  async adminListRewards(opts: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        rr.id, rr.user_id, rr.reward_block, rr.milestone_target,
        rr.amount_cents, rr.currency, rr.status,
        rr.unlocked_at, rr.claimable_at, rr.reserved_at, rr.paid_at, rr.reversed_at,
        rr.payout_request_id, rr.rule_snapshot,
        rr.created_at,
        u.email, u.fullname, u.phone
      FROM referral_rewards rr
      LEFT JOIN users u ON u.id = rr.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let i = 1;

    if (opts.status && opts.status !== 'all') {
      query += ` AND rr.status = $${i++}`;
      params.push(opts.status);
    }

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) sub`, params,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    query += ` ORDER BY rr.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const data = await this.dataSource.query(query, params);
    return { data, total };
  }

  async adminListPayoutRequests(opts: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        pr.id, pr.user_id, pr.payout_method, pr.payout_details,
        pr.total_amount_cents, pr.reward_count, pr.status,
        pr.submitted_at, pr.reviewed_at, pr.approved_at, pr.paid_at,
        pr.admin_notes, pr.created_at,
        u.email, u.fullname, u.phone
      FROM payout_requests pr
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let i = 1;
    if (opts.status && opts.status !== 'all') {
      query += ` AND pr.status = $${i++}`;
      params.push(opts.status);
    }
    const countRows = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) sub`, params,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    query += ` ORDER BY pr.created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);
    const data = await this.dataSource.query(query, params);
    return { data, total };
  }

  async adminGetPayoutRequest(requestId: string): Promise<{
    request: any;
    items: Array<{ referralRewardId: string; amountCents: number; rewardBlock: number | null }>;
  }> {
    const rows = await this.dataSource.query(
      `
      SELECT
        pr.id, pr.user_id, pr.payout_method, pr.payout_details,
        pr.total_amount_cents, pr.reward_count, pr.status,
        pr.submitted_at, pr.reviewed_at, pr.approved_at, pr.paid_at,
        pr.admin_notes, pr.created_at,
        u.email, u.fullname, u.phone
      FROM payout_requests pr
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE pr.id = $1
      LIMIT 1
      `,
      [requestId],
    );
    const request = rows?.[0];
    if (!request) throw new NotFoundException('Payout request not found');

    const items = await this.dataSource.query(
      `
      SELECT
        i.referral_reward_id AS "referralRewardId",
        i.amount_cents AS "amountCents",
        rr.reward_block AS "rewardBlock"
      FROM payout_request_items i
      LEFT JOIN referral_rewards rr ON rr.id = i.referral_reward_id
      WHERE i.payout_request_id = $1
      ORDER BY rr.reward_block ASC NULLS LAST, i.created_at ASC
      `,
      [requestId],
    );

    return { request, items };
  }

  async adminApprovePayoutRequest(requestId: string, adminNotes?: string): Promise<PayoutRequest> {
    return this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(PayoutRequest);
      const req = await repo.findOne({
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!req) throw new NotFoundException('Payout request not found');
      if (!['submitted', 'under_review'].includes(req.status)) {
        throw new BadRequestException(`Cannot approve request in status "${req.status}"`);
      }
      const old = req.status;
      req.status = 'approved';
      req.reviewedAt = req.reviewedAt ?? new Date();
      req.approvedAt = new Date();
      if (adminNotes) req.adminNotes = adminNotes;
      await repo.save(req);
      await this.audit('payout_request', req.id, 'STATUS_CHANGED', old, req.status, null, { adminNotes });
      return req;
    });
  }

  async adminRejectPayoutRequest(requestId: string, adminNotes: string): Promise<PayoutRequest> {
    if (!adminNotes?.trim()) throw new BadRequestException('adminNotes is required');
    return this.dataSource.transaction(async (em) => {
      const reqRepo = em.getRepository(PayoutRequest);
      const itemRepo = em.getRepository(PayoutRequestItem);
      const rewardRepo = em.getRepository(ReferralReward);

      const req = await reqRepo.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } });
      if (!req) throw new NotFoundException('Payout request not found');
      if (!['submitted', 'under_review', 'approved'].includes(req.status)) {
        throw new BadRequestException(`Cannot reject request in status "${req.status}"`);
      }

      const items = await itemRepo.find({ where: { payoutRequestId: req.id }, lock: { mode: 'pessimistic_write' } });
      const rewardIds = items.map((it) => it.referralRewardId);
      if (rewardIds.length > 0) {
        const rewards = await rewardRepo.find({ where: { id: In(rewardIds) }, lock: { mode: 'pessimistic_write' } });
        for (const r of rewards) {
          if (r.payoutRequestId !== req.id) continue;
          const old = r.status;
          r.status = 'claimable';
          r.payoutRequestId = null;
          r.reservedAt = null;
          await rewardRepo.save(r);
          await this.audit('reward', r.id, 'STATUS_CHANGED', old, r.status, null, { releasedFrom: req.id });
        }
        // Remove items so rewards can be included in future requests (unique constraint)
        await itemRepo.delete({ payoutRequestId: req.id });
      }

      const old = req.status;
      req.status = 'rejected';
      req.reviewedAt = new Date();
      req.adminNotes = adminNotes;
      await reqRepo.save(req);
      await this.audit('payout_request', req.id, 'STATUS_CHANGED', old, req.status, null, { adminNotes });
      return req;
    });
  }

  async adminMarkPaidPayoutRequest(requestId: string, adminNotes?: string): Promise<PayoutRequest> {
    return this.dataSource.transaction(async (em) => {
      const reqRepo = em.getRepository(PayoutRequest);
      const itemRepo = em.getRepository(PayoutRequestItem);
      const rewardRepo = em.getRepository(ReferralReward);

      const req = await reqRepo.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } });
      if (!req) throw new NotFoundException('Payout request not found');
      if (req.status !== 'approved') {
        throw new BadRequestException(`Request must be approved before marking paid (current: "${req.status}")`);
      }

      const items = await itemRepo.find({ where: { payoutRequestId: req.id }, lock: { mode: 'pessimistic_write' } });
      const rewardIds = items.map((it) => it.referralRewardId);
      if (rewardIds.length > 0) {
        const rewards = await rewardRepo.find({ where: { id: In(rewardIds) }, lock: { mode: 'pessimistic_write' } });
        for (const r of rewards) {
          if (r.payoutRequestId !== req.id) continue;
          const old = r.status;
          r.status = 'paid';
          r.paidAt = new Date();
          await rewardRepo.save(r);
          await this.audit('reward', r.id, 'STATUS_CHANGED', old, r.status, null, { payoutRequestId: req.id });
        }
      }

      const old = req.status;
      req.status = 'paid';
      req.paidAt = new Date();
      if (adminNotes) req.adminNotes = adminNotes;
      await reqRepo.save(req);
      await this.audit('payout_request', req.id, 'STATUS_CHANGED', old, req.status, null, { adminNotes });
      return req;
    });
  }

  async adminGetTopReferrers(limit = 20): Promise<any[]> {
    return this.dataSource.query(
      `SELECT
        r.referrer_user_id AS user_id,
        u.email, u.fullname,
        COUNT(*) FILTER (WHERE r.status != 'fraud') AS total_invited,
        COUNT(*) FILTER (WHERE r.status IN ('qualified', 'rewarded')) AS qualified,
        COUNT(*) FILTER (WHERE r.status = 'rewarded') AS rewarded
      FROM referrals r
      LEFT JOIN users u ON u.id = r.referrer_user_id
      GROUP BY r.referrer_user_id, u.email, u.fullname
      ORDER BY qualified DESC
      LIMIT $1`,
      [limit],
    );
  }

  async adminListAuditLog(opts: {
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, opts.limit ?? 50);
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        id, entity_type, entity_id, action, old_status, new_status,
        changed_by, metadata, created_at
      FROM referral_audit_log
      WHERE 1=1
    `;
    const params: any[] = [];
    let i = 1;

    if (opts.entityType) {
      query += ` AND entity_type = $${i++}`;
      params.push(opts.entityType);
    }
    if (opts.entityId) {
      query += ` AND entity_id = $${i++}`;
      params.push(opts.entityId);
    }

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) sub`, params,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    query += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);
    const data = await this.dataSource.query(query, params);
    return { data, total };
  }

  async adminApproveReward(rewardId: string, adminNotes?: string): Promise<ReferralReward> {
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (!['reserved'].includes(reward.status)) {
      throw new BadRequestException(`Cannot approve reward in status "${reward.status}"`);
    }
    reward.status = 'approved';
    return this.rewardRepo.save(reward);
  }

  async adminRejectReward(rewardId: string, adminNotes: string): Promise<ReferralReward> {
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    reward.status = 'rejected';
    return this.rewardRepo.save(reward);
  }

  async adminMarkPaid(rewardId: string, adminNotes?: string): Promise<ReferralReward> {
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.status !== 'approved') {
      throw new BadRequestException(`Reward must be approved before marking as paid (current: "${reward.status}")`);
    }
    reward.status = 'paid';
    reward.paidAt = new Date();
    return this.rewardRepo.save(reward);
  }

  async adminFlagFraud(
    referralId: string,
    flags: string[],
    adminNotes?: string,
  ): Promise<Referral> {
    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Referral not found');
    referral.status = 'fraud_flagged';
    referral.fraudFlags = [...new Set([...(referral.fraudFlags ?? []), ...flags])];
    if (adminNotes) referral.adminNotes = adminNotes;
    return this.referralRepo.save(referral);
  }

  async adminRejectReferral(referralId: string, adminNotes: string): Promise<Referral> {
    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Referral not found');
    referral.status = 'rejected';
    referral.adminNotes = adminNotes;
    return this.referralRepo.save(referral);
  }

  async adminGetStats(): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    qualifiedReferrals: number;
    fraudReferrals: number;
    pendingPayouts: number;
    approvedPayouts: number;
    totalPaid: number;
  }> {
    const [[counts], [payoutCounts], [paidCounts]] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('created','pending')) AS pending,
          COUNT(*) FILTER (WHERE status IN ('qualified', 'rewarded')) AS qualified,
          COUNT(*) FILTER (WHERE status IN ('fraud','fraud_flagged')) AS fraud
        FROM referrals
      `),
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('submitted','under_review')) AS pending_payouts,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved_payouts
        FROM payout_requests
      `),
      this.dataSource.query(`
        SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0) AS total_paid_millimes
        FROM referral_rewards
      `),
    ]);

    return {
      totalReferrals: parseInt(counts.total, 10),
      pendingReferrals: parseInt(counts.pending, 10),
      qualifiedReferrals: parseInt(counts.qualified, 10),
      fraudReferrals: parseInt(counts.fraud, 10),
      pendingPayouts: parseInt(payoutCounts.pending_payouts, 10),
      approvedPayouts: parseInt(payoutCounts.approved_payouts, 10),
      totalPaid: parseInt(paidCounts.total_paid_millimes, 10),
    };
  }
}
