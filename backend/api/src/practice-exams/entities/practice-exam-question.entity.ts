import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PracticeExam } from './practice-exam.entity';

export interface PracticeExamOption {
  id: string;
  text: string;
}

@Entity('practice_exam_questions')
@Index('IDX_practice_exam_questions_exam_id', ['practiceExamId'])
@Index('IDX_practice_exam_questions_unique_order', ['practiceExamId', 'questionOrder'], { unique: true })
export class PracticeExamQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'practice_exam_id' })
  practiceExamId!: number;

  @ManyToOne(() => PracticeExam, (e) => e.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'practice_exam_id' })
  practiceExam!: PracticeExam;

  @Column({ name: 'external_id', type: 'varchar', length: 120, nullable: true })
  externalId!: string | null;

  @Column({ name: 'question_order', type: 'int', default: 0 })
  questionOrder!: number;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  options!: PracticeExamOption[];

  /** Stored as a JSON array of option IDs (or option texts) so multi-correct works. */
  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  correct!: string[];

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  translations?: Record<string, {
    prompt?: string;
    options?: Array<{ id: string; text: string }>;
    explanation?: string | null;
  }>;

  @Column({ type: 'varchar', length: 120, nullable: true })
  domain!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  difficulty!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
