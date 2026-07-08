import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { PayoutMethod } from './payout-account.entity';

export type PayoutRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled';

@Entity('payout_requests')
@Index(['userId'])
@Index(['status'])
export class PayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'payout_account_id', type: 'uuid', nullable: true })
  payoutAccountId!: string | null;

  @Column({ name: 'payout_method', type: 'varchar', length: 8 })
  payoutMethod!: PayoutMethod;

  /** Snapshot at request time */
  @Column({ name: 'payout_details', type: 'jsonb', default: () => "'{}'::jsonb" })
  payoutDetails!: Record<string, string>;

  @Column({ name: 'total_amount_cents', type: 'int' })
  totalAmountCents!: number;

  @Column({ name: 'reward_count', type: 'int' })
  rewardCount!: number;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'submitted' })
  status!: PayoutRequestStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes!: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

