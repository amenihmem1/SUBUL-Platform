import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserSubscription } from './user-subscription.entity';
import { UniversityLicense } from '../../university/entities/university-license.entity';
import { PlanBillingOption } from './plan-billing-option.entity';

export type PlanType = 'free' | 'standard' | 'premium' | 'university' | 'enterprise';
export type PlanVisibility = 'public' | 'hidden' | 'internal';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 128, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 32, default: 'standard' })
  type!: PlanType;

  @Column({ type: 'varchar', length: 32, default: 'public' })
  visibility!: PlanVisibility;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'badge_text', type: 'varchar', length: 128, nullable: true })
  badgeText?: string;

  @Column({ name: 'theme_color', type: 'varchar', length: 64, nullable: true })
  themeColor?: string;

  /** JSON: trialDurationHours, max_programs, agent_monthly_limit, etc. */
  @Column({ type: 'text', nullable: true })
  features?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PlanBillingOption, o => o.plan, { cascade: true })
  billingOptions!: PlanBillingOption[];

  @OneToMany(() => UserSubscription, s => s.plan)
  userSubscriptions!: UserSubscription[];

  @OneToMany(() => UniversityLicense, l => l.plan)
  universityLicenses!: UniversityLicense[];
}
