import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type ReferralStatus =
  | 'created'
  | 'pending' // legacy alias for created (older data/UI)
  | 'email_verified'
  | 'payment_pending'
  | 'active_waiting'
  | 'qualified'
  | 'disqualified'
  | 'fraud' // legacy alias for fraud_flagged (older code)
  | 'fraud_flagged'
  | 'rejected'
  | 'rewarded';

export type DisqualificationReason = 'refund' | 'chargeback' | 'fraud' | 'admin';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'referrer_user_id', type: 'int' })
  @Index('idx_referrals_referrer')
  referrerUserId!: number;

  @Column({ name: 'referred_user_id', type: 'int', unique: true })
  referredUserId!: number;

  @Column({ name: 'referral_code_used', type: 'varchar', length: 16 })
  @Index('idx_referrals_code')
  referralCodeUsed!: string;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'created' })
  @Index('idx_referrals_status')
  status!: ReferralStatus;

  @Column({ name: 'fraud_score', type: 'smallint', default: 0 })
  fraudScore!: number;

  @Column({ name: 'fraud_flags', type: 'jsonb', nullable: true })
  fraudFlags!: string[] | null;

  @Column({ name: 'signup_ip', type: 'varchar', length: 64, nullable: true })
  signupIp!: string | null;

  @Column({ name: 'signup_at', type: 'timestamptz', nullable: true })
  signupAt!: Date | null;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;

  @Column({ name: 'waiting_period_ends_at', type: 'timestamptz', nullable: true })
  waitingPeriodEndsAt!: Date | null;

  @Column({ name: 'qualified_at', type: 'timestamptz', nullable: true })
  qualifiedAt!: Date | null;

  @Column({ name: 'disqualified_at', type: 'timestamptz', nullable: true })
  disqualifiedAt!: Date | null;

  @Column({ name: 'disqualification_reason', type: 'varchar', length: 64, nullable: true })
  disqualificationReason!: DisqualificationReason | null;

  @Column({ name: 'rewarded_at', type: 'timestamptz', nullable: true })
  rewardedAt!: Date | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
