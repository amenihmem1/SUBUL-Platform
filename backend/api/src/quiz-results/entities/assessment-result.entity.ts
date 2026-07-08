import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('assessment_results')
export class AssessmentResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'quiz_type', length: 20, default: 'assessment' })
  quizType!: 'assessment' | 'level';

  @Column({ length: 10, nullable: true })
  domain!: 'cloud' | 'cyber' | 'ai' | 'devops';

  @Column({ type: 'jsonb', nullable: true })
  scores!: {
    cloudPercentage: number;
    cyberPercentage: number;
    aiPercentage: number;
    devopsPercentage?: number;
  };

  @Column({ length: 50, nullable: true, name: 'primaryProfile' })
  primaryProfile!: string;

  @Column({ type: 'json', nullable: true, name: 'hybridProfiles' })
  hybridProfiles!: string[];

  @Column({ name: 'attempt_number', default: 1 })
  attemptNumber!: number;  

  @Column({ name: 'is_latest', default: true })
  isLatest!: boolean;  

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'completed_at' })
  completedAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt!: Date;
}