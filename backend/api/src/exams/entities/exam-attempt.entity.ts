import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../users/entities/user.entity';

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'exam_id' })
  examId!: number;

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score!: number;

  @Column({ enum: ['passed', 'failed'], default: 'failed' })
  status!: string;

  @Column({ name: 'time_spent', nullable: true })
  timeSpent!: string;

  @Column({ name: 'streak_bonus', default: false })
  streakBonus!: boolean;

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date;
}
