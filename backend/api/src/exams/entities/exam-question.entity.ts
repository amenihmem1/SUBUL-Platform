import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from './exam.entity';

export type ExamQuestionOption = { id: string; text: string };

@Entity('exam_questions')
export class ExamQuestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'exam_id' })
  examId!: number;

  @ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'jsonb' })
  options!: ExamQuestionOption[];

  @Column({ name: 'correct_option_id', length: 64 })
  correctOptionId!: string;
}
