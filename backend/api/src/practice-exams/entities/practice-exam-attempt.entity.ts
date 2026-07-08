import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PracticeExam } from './practice-exam.entity';

@Entity('practice_exam_attempts')
@Index('IDX_practice_exam_attempts_user', ['userId'])
@Index('IDX_practice_exam_attempts_exam', ['practiceExamId'])
export class PracticeExamAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'practice_exam_id', type: 'int' })
  practiceExamId!: number;

  @ManyToOne(() => PracticeExam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practice_exam_id' })
  practiceExam!: PracticeExam;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: 'passed' | 'failed';

  @Column({ name: 'correct_count', type: 'int', default: 0 })
  correctCount!: number;

  @Column({ name: 'question_count', type: 'int', default: 0 })
  questionCount!: number;

  @Column({ name: 'time_spent', type: 'varchar', length: 32, nullable: true })
  timeSpent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
