import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LabCloudCredential } from './lab-cloud-credential.entity';

@Entity('lab_access_sessions')
export class LabAccessSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  @Column({ name: 'credential_id', type: 'int', nullable: true })
  credentialId!: number | null;

  @Column({ name: 'granted_by', type: 'int', nullable: true })
  grantedBy!: number | null;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => LabCloudCredential, (c) => c.sessions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'credential_id' })
  credential!: LabCloudCredential | null;
}
