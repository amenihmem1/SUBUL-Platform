import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Lesson } from './lesson.entity';

/**
 * Stores locale-specific overrides for lesson text fields.
 * The base `lessons` table holds the authoritative English content.
 * Each row here is a (lesson_id, locale) pair; any null field falls back
 * to the corresponding field on the parent Lesson.
 */
@Entity('lesson_translations')
@Unique('uq_lesson_locale', ['lessonId', 'locale'])
export class LessonTranslation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'lesson_id' })
  lessonId!: number;

  @Column({ length: 10 })
  locale!: string; // e.g. 'fr' | 'ar' | 'en'

  @Column({ length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'json', nullable: true })
  bullets?: string[];

  @Column({ type: 'text', nullable: true })
  analogy?: string;

  @Column({ name: 'comparison_table', type: 'json', nullable: true })
  comparisonTable?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt!: Date;

  @ManyToOne(() => Lesson, (lesson) => lesson.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson!: Lesson;
}
