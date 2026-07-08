import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'expired', 'cancelled', 'pending_payment', 'none'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

@Entity('user_subscriptions')
@Index(['userId', 'status'])
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => SubscriptionPlan, p => p.userSubscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: SubscriptionPlan;

  @Column({ name: 'subscription_status', length: 32, default: 'trial' })
  status!: SubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamp without time zone', nullable: true })
  currentPeriodStart?: Date;

  @Column({ name: 'current_period_end', type: 'timestamp without time zone', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ name: 'trial_start_date', type: 'timestamp without time zone', nullable: true })
  trialStartDate?: Date;

  @Column({ name: 'trial_end_date', type: 'timestamp without time zone', nullable: true })
  trialEndDate?: Date;

  @Column({ name: 'is_trial_used', default: false })
  isTrialUsed!: boolean;

  // Payment reference
  @Column({ name: 'payment_transaction_id', type: 'uuid', nullable: true })
  paymentTransactionId?: string;

  @Column({ name: 'payment_provider', length: 32, nullable: true })
  paymentProvider?: string;

  @Column({ name: 'country_code', length: 2, nullable: true })
  countryCode?: string;

  @Column({ name: 'currency', length: 3, nullable: true })
  currency?: string;

  @Column({ name: 'amount_paid_cents', type: 'int', nullable: true })
  amountPaidCents?: number;

  @Column({ name: 'auto_renew', default: false })
  autoRenew!: boolean;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
