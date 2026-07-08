import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type FeedbackReason = 'off_topic' | 'wrong_answer' | 'unclear' | 'too_hard' | 'not_in_course' | 'other';
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

@Entity('quiz_feedback')
export class QuizFeedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId!: string | null;

  @Column({ name: 'module_title', type: 'varchar', length: 500, nullable: true })
  moduleTitle!: string | null;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'question_type', type: 'varchar', length: 20, default: 'qcm' })
  questionType!: string;

  @Column({ name: 'correct_answer', type: 'varchar', length: 10, nullable: true })
  correctAnswer!: string | null;

  @Column({ length: 50, default: 'off_topic' })
  reason!: FeedbackReason;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ length: 20, default: 'pending' })
  status!: FeedbackStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
