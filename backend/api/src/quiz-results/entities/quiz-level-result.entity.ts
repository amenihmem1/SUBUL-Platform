import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('quiz_level_results')
export class QuizLevelResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 10 })
  domain!: 'devops' | 'ai' | 'cyber';

  @Column({ type: 'jsonb' })
  answers!: Record<number, string>;

  @Column({ type: 'jsonb' })
  questions!: Array<{
    id: number;
    domain: string;
    question: string;
    difficulty: string;
    points: number;
    correct: boolean;
  }>;

  @Column({ type: 'jsonb' })
  score!: {
    score: number;
    total: number;
    percentage: number;
  };

  @Column({ length: 20 })
  level!: 'Débutant' | 'Intermédiaire' | 'Expert';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'completed_at' })
  completedAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt!: Date;
}