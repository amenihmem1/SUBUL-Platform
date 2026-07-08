import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type RewardStatus =
  | 'unlocked'    // internal: created but not yet claimable (future waiting periods)
  | 'claimable'   // can be selected in a payout request
  | 'reserved'    // locked inside a payout request
  | 'approved'    // payout request approved by admin (optional per item)
  | 'paid'        // paid out
  | 'rejected'    // rejected (final)
  | 'reversed'    // reversed due to disqualification/refund/chargeback
  | 'cancelled';  // admin-cancelled

@Entity('referral_rewards')
@Index(['userId'])
@Index(['status'])
@Index(['payoutRequestId'])
export class ReferralReward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The referrer earning this reward */
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  /** 1-based block number (every 20 qualified referrals unlocks one block) */
  @Column({ name: 'reward_block', type: 'int' })
  rewardBlock!: number;

  /** How many qualified referrals trigger each block (snapshot) */
  @Column({ name: 'milestone_target', type: 'int', default: 20 })
  milestoneTarget!: number;

  /**
   * Reward value in millimes (same convention as payment_transactions.amount_cents for TND).
   * 100 TND = 100_000 millimes.
   */
  @Column({ name: 'amount_cents', type: 'int', default: 100000 })
  amountCents!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'claimable' })
  status!: RewardStatus;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true })
  unlockedAt!: Date | null;

  @Column({ name: 'claimable_at', type: 'timestamptz', nullable: true })
  claimableAt!: Date | null;

  @Column({ name: 'reserved_at', type: 'timestamptz', nullable: true })
  reservedAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt!: Date | null;

  @Column({ name: 'payout_request_id', type: 'uuid', nullable: true })
  payoutRequestId!: string | null;

  /** Snapshot of business rules used to unlock this reward */
  @Column({ name: 'rule_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  ruleSnapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
