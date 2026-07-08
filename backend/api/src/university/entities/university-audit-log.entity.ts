import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { University } from './university.entity';
import { User } from '../../users/entities/user.entity';

export type AuditEntityType =
  | 'university'
  | 'membership'
  | 'invite'
  | 'license'
  | 'cohort'
  | 'department';

@Entity('university_audit_logs')
export class UniversityAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'university_id', type: 'uuid' })
  universityId!: string;

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'university_id' })
  university!: University;

  @Column({ name: 'actor_user_id', nullable: true })
  actorUserId?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User;

  @Column({ name: 'entity_type', length: 64 })
  entityType!: AuditEntityType;

  @Column({ name: 'entity_id', length: 128 })
  entityId!: string;

  @Column({ length: 128 })
  action!: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue?: Record<string, unknown>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown>;

  @Column({ name: 'ip_address', length: 64, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
