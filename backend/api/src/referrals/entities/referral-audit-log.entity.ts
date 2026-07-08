import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReferralAuditEntityType = 'referral' | 'reward' | 'payout_request' | 'payout_account';

@Entity('referral_audit_log')
@Index(['entityType', 'entityId'])
export class ReferralAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 32 })
  entityType!: ReferralAuditEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ name: 'action', type: 'varchar', length: 64 })
  action!: string;

  @Column({ name: 'old_status', type: 'varchar', length: 32, nullable: true })
  oldStatus!: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 32, nullable: true })
  newStatus!: string | null;

  /** user_id (null = system) */
  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy!: number | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

