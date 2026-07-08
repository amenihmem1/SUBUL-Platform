import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { CourseModule } from './course-module.entity';
import { LessonTranslation } from './lesson-translation.entity';

@Entity('lessons')
@Unique('uq_lesson_order_per_module', ['moduleId', 'lessonOrder'])
export class Lesson {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'module_id' })
  moduleId!: number;

  @Column({ name: 'lesson_order', type: 'smallint' })
  lessonOrder!: number;

  @Column({ name: 'external_id', length: 100, nullable: true })
  externalId?: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'json', nullable: true, default: [] })
  bullets?: string[];

  @Column({ name: 'key_points', type: 'json', nullable: true, default: [] })
  keyPoints?: string[];

  @Column({ type: 'text', nullable: true })
  analogy?: string;

  @Column({ name: 'comparison_table', type: 'json', nullable: true })
  comparisonTable?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt!: Date;

  @ManyToOne(() => CourseModule, (module) => module.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module!: CourseModule;

  @OneToMany(() => LessonTranslation, (t) => t.lesson)
  translations?: LessonTranslation[];

  toDict(): Record<string, any> {
    return {
      id: this.id,
      order: this.lessonOrder,
      title: this.title,
      content: this.content ?? null,
      bullets: this.bullets ?? [],
    };
  }
}
