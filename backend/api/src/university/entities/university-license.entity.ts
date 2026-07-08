import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { University } from './university.entity';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity';

export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'pending_renewal';

@Entity('university_licenses')
export class UniversityLicense {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, u => u.licenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => SubscriptionPlan, p => p.universityLicenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: SubscriptionPlan;

  @Column({ name: 'seats_total', type: 'int', default: 0 })
  seatsTotal!: number;

  @Column({ name: 'seats_used', type: 'int', default: 0 })
  seatsUsed!: number;

  @Column({ name: 'valid_from', type: 'timestamp without time zone', nullable: true })
  validFrom?: Date;

  @Column({ name: 'valid_until', type: 'timestamp without time zone', nullable: true })
  validUntil?: Date;

  @Column({ length: 32, default: 'active' })
  status!: LicenseStatus;

  @Column({ name: 'license_key', length: 64, unique: true, nullable: true })
  licenseKey?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'price_cents', type: 'int', nullable: true })
  priceCents?: number;

  @Column({ length: 8, default: 'EUR' })
  currency!: string;

  @Column({ name: 'auto_renew', default: false })
  autoRenew!: boolean;

  @Column({ name: 'renewed_from', type: 'uuid', nullable: true })
  renewedFrom?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
