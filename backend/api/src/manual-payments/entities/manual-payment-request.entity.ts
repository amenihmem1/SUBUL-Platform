import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type ManualPaymentMethod = 'bank_transfer' | 'd17';

export type ManualPaymentStatus =
  | 'pending'
  | 'proof_uploaded'
  | 'pending_review'
  | 'approved'
  | 'rejected';

@Entity('manual_payment_requests')
@Index(['userId'])
@Index(['status'])
@Index(['orderId'], { unique: true })
export class ManualPaymentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_id', type: 'varchar', unique: true })
  orderId!: string;

  @Column({ name: 'plan_slug', type: 'varchar', default: 'standard' })
  planSlug!: string;

  @Column({ name: 'plan_name', type: 'varchar', default: 'Plan Standard' })
  planName!: string;

  @Column({ name: 'billing_cycle', type: 'varchar', default: 'monthly' })
  billingCycle!: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  @Column({ name: 'payment_method', type: 'varchar' })
  paymentMethod!: ManualPaymentMethod;

  @Column({ type: 'varchar', default: 'pending' })
  status!: ManualPaymentStatus;

  @Column({ name: 'proof_file_url', type: 'varchar', nullable: true, default: null })
  proofFileUrl!: string | null;

  @Column({ name: 'proof_file_path', type: 'varchar', nullable: true, default: null })
  proofFilePath!: string | null;

  @Column({ name: 'proof_file_name', type: 'varchar', nullable: true, default: null })
  proofFileName!: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true, default: null })
  adminNotes!: string | null;

  @Column({ name: 'approved_by', type: 'int', nullable: true, default: null })
  approvedBy!: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true, default: null })
  approvedAt!: Date | null;

  @Column({ name: 'selected_duration_months', type: 'int', nullable: true, default: null })
  selectedDurationMonths!: number | null;

  @Column({ name: 'activated_subscription_id', type: 'varchar', nullable: true, default: null })
  activatedSubscriptionId!: string | null;

  @Column({ name: 'user_email', type: 'varchar', nullable: true, default: null })
  userEmail!: string | null;

  @Column({ name: 'user_full_name', type: 'varchar', nullable: true, default: null })
  userFullName!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
