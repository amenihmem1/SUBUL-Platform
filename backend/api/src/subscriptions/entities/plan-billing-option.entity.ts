import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

export type PricingRegion = 'TN' | 'EU' | 'US' | 'DEFAULT';
export type BillingCycle = 'monthly' | 'quarterly' | 'semester' | 'annual';

@Entity('plan_billing_options')
export class PlanBillingOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => SubscriptionPlan, plan => plan.billingOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: SubscriptionPlan;

  @Column({ type: 'varchar', length: 16, default: 'DEFAULT' })
  region!: PricingRegion;

  @Column({ type: 'varchar', length: 32 })
  cycle!: BillingCycle;

  @Column({ name: 'price_cents', type: 'int', default: 0 })
  priceCents!: number;

  @Column({ length: 3, default: 'EUR' })
  currency!: string;

  @Column({ name: 'discount_text', type: 'varchar', length: 128, nullable: true })
  discountText?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
