import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_cvs')
@Index(['userId'], { unique: true })
export class UserCv {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'file_path', length: 512, nullable: true })
  filePath?: string;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'file_mime', length: 128, nullable: true })
  fileMime?: string;

  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData?: Record<string, unknown>;

  @Column({ name: 'ats_score', type: 'float', nullable: true })
  atsScore?: number;

  @Column({ name: 'last_analyzed_at', type: 'timestamp without time zone', nullable: true })
  lastAnalyzedAt?: Date;

  @Column({ name: 'created_at', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
