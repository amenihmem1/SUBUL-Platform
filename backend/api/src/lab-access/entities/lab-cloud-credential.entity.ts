import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LabAccessSession } from './lab-access-session.entity';

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'nvidia';
export type CredentialType = 'sandbox_account' | 'iam_user' | 'voucher_code' | 'api_key';

@Entity('lab_cloud_credentials')
export class LabCloudCredential {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  provider!: CloudProvider;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'credential_type', type: 'varchar', length: 30, default: 'sandbox_account' })
  credentialType!: CredentialType;

  @Column({ name: 'console_url', type: 'text', nullable: true })
  consoleUrl!: string | null;

  @Column({ name: 'login_email', type: 'text', nullable: true })
  loginEmail!: string | null;

  @Column({ name: 'login_password', type: 'text', nullable: true })
  loginPassword!: string | null;

  @Column({ name: 'access_key', type: 'text', nullable: true })
  accessKey!: string | null;

  @Column({ name: 'secret_key', type: 'text', nullable: true })
  secretKey!: string | null;

  @Column({ name: 'extra_fields', type: 'jsonb', nullable: true })
  extraFields!: Record<string, string> | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => LabAccessSession, (s) => s.credential)
  sessions!: LabAccessSession[];
}
